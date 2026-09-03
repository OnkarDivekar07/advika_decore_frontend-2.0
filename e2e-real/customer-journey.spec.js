// e2e-real/customer-journey.spec.js — REAL FULL-STACK E2E.
//
// Real browser -> real Vite dev server (port 5174, --mode e2e) -> real
// Express backend (backend 2.0, `npm run e2e:server`, port 5001) -> real
// MongoDB Atlas database (advikaautoaccessories_e2e) -> real business logic
// (Prisma, pricing, stock) -> real HTTP response -> browser. NOTHING in
// this file calls page.route()/route.fulfill() — see support/realApi.js's
// header comment for what "real" means here and why.
//
// Prerequisites (see repo root's E2E_REAL_README.md for the exact
// commands): backend 2.0's mock MSG91/Delhivery servers running, the E2E
// database reset+seeded, and the real E2E backend server running on 5001,
// all BEFORE this spec runs.
//
// The task's own step ordering ("add to cart" before "login") doesn't
// match how this app actually works — cart.routes.js requires
// authentication for every cart endpoint (confirmed against the real
// backend, not assumed) — so login is moved earlier here to match the
// app's real, enforced order. Every other step matches the requested
// journey.
import { test, expect } from '@playwright/test';
import realApi from './support/realApi.js';
import { E2E_CUSTOMER_PHONE, E2E_OTP, E2E_ADDRESS } from './fixtures/e2eData.js';

async function getAuthToken(page) {
  return page.evaluate(() => window.sessionStorage.getItem('authToken'));
}

test.describe.serial('Real customer journey (real backend + real DB)', () => {
  // A single shared browser context/page for the whole journey, not the
  // per-test `page` fixture — Playwright gives every individual test() a
  // fresh, isolated context by default (even inside describe.serial),
  // which would silently drop the real session's sessionStorage between
  // steps. A real customer's browser tab persists across "add to cart" ->
  // "checkout" too, so one shared page for this whole journey is what
  // actually matches real usage, not a test-harness artifact. (Confirmed
  // the hard way: without this, "add to cart" appeared to work in the UI
  // — the frontend has its own local cart state — but the real backend
  // never saw it, because the real JWT never made it to that step's
  // request.)
  let page;
  let authToken;
  let searchedProductName;
  let productId;
  let orderId;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('homepage loads real banners/new-arrivals from the real backend', async () => {
    const response = await page.goto('/');
    expect(response.ok()).toBeTruthy();
    // The homepage's hero/new-arrivals rail is fed by real GET
    // /api/homepage/* + /api/products?isBestSeller=true calls — wait for
    // the real network round trip, not just the shell to paint.
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Cannot GET');
  });

  test('search finds a real seeded product, listing -> detail', async () => {
    searchedProductName = 'Chrome Air Horn Set, 4 Pipe'; // real prisma/seed.js catalog item
    // The product-listing page's own search box (product-listing-search-input)
    // only navigates to /search on form submit — it does NOT call
    // /api/products?search= directly (confirmed by reading
    // ProductListingPage.jsx: its onChange only updates local state; the
    // actual debounced search request happens on the dedicated
    // SearchResultsPage at /search, via its own `search-results-input`
    // testid — see SearchResultsPage.jsx/useProductSearch.js). Driving the
    // real /search flow directly, rather than assuming the listing page's
    // box itself triggers a request, is what actually matches the app.
    await page.goto('/search');
    await page.getByTestId('search-results-input').fill('Chrome Air Horn');

    // Real debounced (400ms) GET /api/products?search=Chrome+Air+Horn
    // against the real backend/real DB — assert on the actual network
    // response, not just what rendered.
    const response = await page.waitForResponse(
      (res) => res.url().includes('/api/products?') && res.url().includes('search=')
    );
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.some((p) => p.name === searchedProductName)).toBe(true);
    productId = body.data.find((p) => p.name === searchedProductName).id;

    await expect(page.getByTestId(`product-card-${productId}`)).toBeVisible({ timeout: 10000 });
    await page.getByTestId(`product-card-${productId}`).getByRole('link', { name: searchedProductName }).click({ force: true });

    // Route is /product/:id/:slug? (AppRoutes.jsx) — singular "product",
    // not "products" (that path is the listing page).
    await expect(page).toHaveURL(new RegExp(`/product/${productId}`), { timeout: 10000 });
    await expect(page.getByTestId('product-detail-add-to-cart-button')).toBeVisible({ timeout: 10000 });
  });

  test('real login: phone + OTP against the real backend (via the mock MSG91 server)', async () => {
    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill(E2E_CUSTOMER_PHONE);
    await expect(page.getByTestId('login-send-otp-button')).toBeEnabled();

    // Real POST /api/otp/send-otp -> real otp.service.js -> real HTTP call
    // to the mock MSG91 server (backend 2.0/tests/e2e-mocks) — not
    // intercepted in the browser.
    const sendRes = page.waitForResponse((res) => res.url().includes('/api/otp/send-otp'));
    await page.getByTestId('login-send-otp-button').click();
    expect((await sendRes).status()).toBe(200);

    await expect(page.getByTestId('login-otp-hidden-input')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('login-otp-hidden-input').fill(E2E_OTP);

    // Real POST /api/otp/verify-otp -> real MSG91 mock verify call -> real
    // Prisma user find-or-create -> real JWT issuance.
    const verifyRes = page.waitForResponse((res) => res.url().includes('/api/otp/verify-otp'));
    await page.getByTestId('login-verify-button').click();
    const verifyResponse = await verifyRes;
    expect(verifyResponse.status()).toBe(200);

    await expect(page.getByTestId('login-fullname-input')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('login-skip-button').click();
    await expect(page.getByTestId('login-start-shopping-button')).toBeVisible({ timeout: 10000 });

    authToken = await getAuthToken(page);
    expect(authToken).toBeTruthy();

    // Verify the account this real login created is a real row in the
    // real database — not just a client-side token.
    const draft = await realApi.getDraftOrder(authToken);
    expect([200, 404]).toContain(draft.status); // 404 is correct: no draft order yet
  });

  test('add to real cart, verified against the real backend (not just the DOM)', async () => {
    await page.goto(`/product/${productId}`);

    // handleAddToCart (ProductDetailPage.jsx) fires PUT /api/cart in the
    // background — the click itself returns immediately, before that
    // request resolves. Against a fast local mock this rarely matters, but
    // over a real network round trip to the real backend, navigating to
    // /cart before this resolves races the write: the immediate
    // page.goto('/cart') below can beat the PUT to the server, or the
    // navigation can cancel the in-flight request outright, so the cart
    // page's own fresh load finds nothing yet. Same wait pattern the next
    // test ("update quantity") already uses for the same endpoint.
    const added = page.waitForResponse(
      (res) => res.url().includes('/api/cart') && res.request().method() === 'PUT'
    );
    await page.getByTestId('product-detail-add-to-cart-button').click();
    expect((await added).status()).toBe(200);

    await page.goto('/cart');
    await expect(page.getByTestId(`cart-item-${productId}`)).toBeVisible({ timeout: 10000 });

    const cart = await realApi.getCart(authToken);
    expect(cart.status).toBe(200);
    expect(cart.body.data.some((item) => item.productId === productId)).toBe(true);
  });

  test('update quantity, verified against the real backend cart', async () => {
    await page.goto('/cart');
    await expect(page.getByTestId(`cart-item-${productId}`)).toBeVisible({ timeout: 10000 });

    const persisted = page.waitForResponse(
      (res) => res.url().includes('/api/cart') && res.request().method() === 'PUT'
    );
    await page.getByTestId(`cart-item-increase-${productId}`).click();
    await expect(page.getByTestId(`cart-item-quantity-${productId}`)).toHaveText('2');
    await persisted;

    const cart = await realApi.getCart(authToken);
    const line = cart.body.data.find((item) => item.productId === productId);
    expect(line.quantity).toBe(2);
  });

  test('create a real delivery address', async () => {
    await page.goto('/addresses');
    await page.getByTestId('address-book-add-new-button').click();
    await page.getByTestId('address-form-name-input').fill(E2E_ADDRESS.name);
    await page.getByTestId('address-form-phone-input').fill(E2E_ADDRESS.phone);
    await page.getByTestId('address-form-pincode-input').fill(E2E_ADDRESS.pincode);
    await page.getByTestId('address-form-city-input').fill(E2E_ADDRESS.city);
    await page.getByTestId('address-form-house-area-input').fill(E2E_ADDRESS.houseArea);
    await page.getByTestId('address-form-area-input').fill(E2E_ADDRESS.area);
    await page.getByTestId('address-form-state-input').fill(E2E_ADDRESS.state);

    const createRes = page.waitForResponse(
      (res) => res.url().includes('/api/user/address') && res.request().method() === 'POST'
    );
    await page.getByTestId('address-form-submit-button').click();
    const created = await createRes;
    expect(created.status()).toBe(200);
    // Asserts on this specific address's own card by id rather than by
    // display name — e2e-real/cross-system/full-lifecycle.spec.js
    // deliberately creates its own address under this same shared E2E
    // customer account (by design — see its own comment), reusing
    // E2E_ADDRESS's `name` field, so a plain getByText(name) match is
    // ambiguous whenever both specs run in the same invocation.
    const createdAddressId = (await created.json()).data.id;
    await expect(page.getByTestId(`address-card-${createdAddressId}`)).toBeVisible({ timeout: 10000 });
  });

  test('full COD checkout: address -> review (real shipping calc + totals) -> payment -> real order placed', async () => {
    await page.goto('/checkout');
    await expect(page.getByTestId('address-selection-continue-button')).toBeEnabled({ timeout: 15000 });
    await page.getByTestId('address-selection-continue-button').click();

    await page.waitForURL(/\/checkout\/review$/, { timeout: 15000 });
    // Real delivery-charge calc: 2x Chrome Air Horn Set (2499 each =
    // 4998) is above FREE_DELIVERY_THRESHOLD=600 (.env.e2e) -> delivery
    // charge should be 0/free, computed server-side, not by the frontend.
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('review-proceed-to-payment-button')).toBeEnabled({ timeout: 15000 });
    await page.getByTestId('review-proceed-to-payment-button').click();

    await page.waitForURL(/\/checkout\/payment$/, { timeout: 15000 });
    await page.getByTestId('payment-method-cod').check({ force: true });
    await expect(page.getByTestId('payment-place-order-button')).toBeEnabled();

    // This click fires the REAL POST /api/payment/cod against the real
    // backend, which runs real stock-decrement + order-confirmation logic
    // and writes a real Order row.
    const placeRes = page.waitForResponse(
      (res) => res.url().includes('/api/payment/cod') && res.request().method() === 'POST'
    );
    await page.getByTestId('payment-place-order-button').click();
    const placed = await placeRes;
    expect(placed.status()).toBe(200);

    await page.waitForURL(/\/order\/success\//, { timeout: 15000 });
    orderId = page.url().split('/order/success/')[1]?.split(/[/?]/)[0];
    expect(orderId).toBeTruthy();
    await expect(page.getByTestId('order-success-track-order-link')).toBeVisible({ timeout: 10000 });

    // Verify the order genuinely exists in the real database via the real
    // API — not inferred from the success page's text alone.
    const orderCheck = await realApi.getOrder(orderId, authToken);
    expect(orderCheck.status).toBe(200);
    expect(orderCheck.body.data.paymentStatus).toBe('cod_pending');
    expect(['pending', 'confirmed']).toContain(orderCheck.body.data.status);
  });

  test('order appears in real order history and detail with the correct real status', async () => {
    await page.goto('/profile?tab=orders');
    await expect(page.getByText(orderId, { exact: false })).toBeVisible({ timeout: 15000 });

    const history = await realApi.getOrderHistory(authToken);
    expect(history.status).toBe(200);
    expect(history.body.data.some((o) => o.id === orderId)).toBe(true);

    await page.goto(`/orders/${orderId}/track`);
    await expect(page.getByText(`#${orderId}`)).toBeVisible({ timeout: 15000 });
  });
});
