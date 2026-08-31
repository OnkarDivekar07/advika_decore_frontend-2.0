// e2e/order-tracking-and-profile.spec.js — OrderTrackingPage
// (/orders/:orderId/track) and UserProfilePage (/profile) tabs + logout.
import { test, expect } from '@playwright/test';
import { installDefaultMocks, loginAs, json, API_BASE } from './support/mockApi.js';
import { PRODUCT_1, ADDRESS_1, envelope } from './fixtures/data.js';

test.describe('Order tracking', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAs(page);
  });

  test('loads the order and shipment status for an order the user owns (200)', async ({ page }) => {
    const orderId = 'order_owned_1';
    const order = {
      id: orderId,
      status: 'shipped',
      paymentStatus: 'cod_pending',
      total: 2499,
      createdAt: new Date().toISOString(),
      orderItems: [{ id: 'item_1', productId: PRODUCT_1.id, quantity: 1, price: PRODUCT_1.price, product: PRODUCT_1 }],
      address: { name: ADDRESS_1.name, houseArea: ADDRESS_1.houseArea, city: ADDRESS_1.city, state: ADDRESS_1.state, pincode: ADDRESS_1.pincode, phone: ADDRESS_1.phone },
    };
    const shipment = {
      status: 'IN_TRANSIT',
      paymentMode: 'COD',
      courierPartner: 'Delhivery',
      trackingId: 'DL123456789',
      estimatedDeliveryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };
    await page.route(`${API_BASE}/api/order/${orderId}`, (route) => json(route, 200, envelope(order)));
    await page.route(`${API_BASE}/api/shipping/${orderId}/track`, (route) => json(route, 200, envelope(shipment)));

    await page.goto(`/orders/${orderId}/track`);

    await expect(page.getByText(`#${orderId}`)).toBeVisible({ timeout: 10000 });
    // resolveStageIndex('shipped', 'IN_TRANSIT') -> the "Shipped" stage —
    // see orderTrackingUtils.js.
    await expect(page.getByText('Shipped', { exact: true }).first()).toBeVisible();
    // exact: true — the stage-progress copy also mentions "Delhivery" in a
    // full sentence ("Handed to Delhivery Surface..."), so a substring
    // match is ambiguous; this targets the shipment-details courier value.
    await expect(page.getByText('Delhivery', { exact: true })).toBeVisible();
    await expect(page.getByText('DL123456789')).toBeVisible();
  });

  test('shows a "not found" state for a nonexistent order id (404)', async ({ page }) => {
    // No override needed — mockApi.js's shared GET /api/order/* handler
    // 404s for any id other than the in-memory draft order's own id.
    await page.goto('/orders/order_does_not_exist/track');

    await expect(page.getByText("We couldn't find that order")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('order-tracking-continue-shopping-link')).toBeVisible();
    // notFound is a distinct case from a generic error — no retry
    // affordance (retrying can't make a nonexistent order exist).
    await expect(page.getByTestId('order-tracking-retry-button')).not.toBeVisible();
  });

  test('shows a "forbidden" state for another user\'s order (403), distinct from notFound/error', async ({ page }) => {
    const orderId = 'order_someone_elses';
    await page.route(`${API_BASE}/api/order/${orderId}`, (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Forbidden', errors: null }) })
    );

    await page.goto(`/orders/${orderId}/track`);

    // OrderTrackingPage.jsx renders the same generic heading for
    // 'forbidden' and 'error' (only 'notFound' gets its own copy) — what
    // actually distinguishes them is that 'error' alone gets a retry
    // button (see the component's `state === 'error' &&` guard).
    // Retrying a 403 can't fix "this isn't your order", so its absence
    // here is exactly what should differ from the 500 case below.
    await expect(page.getByText("Couldn't load your order")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('order-tracking-retry-button')).not.toBeVisible();
    await expect(page.getByTestId('order-tracking-continue-shopping-link')).toBeVisible();
  });

  test('shows a generic error state for a 500, with a working retry', async ({ page }) => {
    const orderId = 'order_flaky';
    let shouldFail = true;
    await page.route(`${API_BASE}/api/order/${orderId}`, (route) => {
      if (shouldFail) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Internal server error', errors: null }) });
      }
      return json(route, 200, envelope({
        id: orderId,
        status: 'confirmed',
        paymentStatus: 'cod_pending',
        total: 999,
        createdAt: new Date().toISOString(),
        orderItems: [],
      }));
    });

    await page.goto(`/orders/${orderId}/track`);
    await expect(page.getByText("Couldn't load your order")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('order-tracking-retry-button')).toBeVisible();

    shouldFail = false;
    await page.getByTestId('order-tracking-retry-button').click();
    await expect(page.getByText(`#${orderId}`)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('User profile', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAs(page);
  });

  test('the profile/orders/addresses tabs switch via the ?tab= query param', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('profile-tab-profile')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('profile-tab-orders').click();
    await expect(page).toHaveURL(/[?&]tab=orders/);

    await page.getByTestId('profile-tab-addresses').click();
    await expect(page).toHaveURL(/[?&]tab=addresses/);
    // The seeded default address (from installDefaultMocks) renders in
    // the addresses tab's read-only list. houseArea (not name) is the
    // unique locator here — ADDRESS_1.name equals USER.name, which also
    // renders in the identity block above the tabs on every tab.
    await expect(page.getByText(ADDRESS_1.houseArea, { exact: false })).toBeVisible({ timeout: 10000 });

    await page.getByTestId('profile-tab-profile').click();
    await expect(page).not.toHaveURL(/tab=/);
  });

  // -----------------------------------------------------------------
  // REGRESSION TEST — src/pages/UserProfile/UserProfilePage.jsx
  // (Orders tab)
  //
  // This suite originally found the Orders tab stuck on an infinite
  // loading spinner for any account with zero placed orders, never
  // reaching the "You haven't placed any orders yet." empty state.
  // Root cause: the tab's render branch gated the spinner on
  // `orderStatus !== STATUS_SUCCESS`, but useOrderHistory.js correctly
  // resolves a genuinely empty history to a *different* resolved status,
  // STATUS_EMPTY — which still satisfies `!== STATUS_SUCCESS`, so the
  // spinner branch won forever for the single most common real case (a
  // new/empty account). Fixed by gating the spinner on `orderStatus ===
  // STATUS_LOADING` specifically instead.
  // -----------------------------------------------------------------
  test('a bookmarked /profile?tab=orders link lands directly on the orders tab', async ({ page }) => {
    await page.goto('/profile?tab=orders');
    await expect(page.getByTestId('profile-tab-orders')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/haven't placed any orders/i)).toBeVisible({ timeout: 10000 });
  });

  test('logging out clears the session and redirects to /login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('profile-logout-button')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('profile-logout-button').click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
    const token = await page.evaluate(() => window.sessionStorage.getItem('authToken'));
    expect(token).toBeFalsy();
  });
});
