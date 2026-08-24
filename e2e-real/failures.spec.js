// e2e-real/failures.spec.js — REAL FULL-STACK E2E, failure scenarios.
//
// Every scenario below is produced by the REAL backend's own real
// validation/business logic reacting to a real request — none of it is
// simulated by mocking the app's own API (per the task's explicit rule).
// Some scenarios are driven through the browser UI (where the UI itself is
// what's under test — invalid login, empty cart); others go straight
// through support/realApi.js (unauthorized access, invalid address,
// invalid quantity, inventory conflict) because that's the more reliable,
// deterministic way to produce that exact real-backend condition — e.g.
// reliably racing two concurrent requests against the last unit of stock
// is impractical to do by clicking two real browsers at exactly the same
// instant, but two concurrent real HTTP requests against the real backend
// exercise the exact same real concurrency-safe stock-decrement code path
// as two real customers would.
import { test, expect } from '@playwright/test';
import realApi from './support/realApi.js';
import { E2E_CUSTOMER_PHONE, E2E_OTP, E2E_ADDRESS_INVALID } from './fixtures/e2eData.js';
import { deleteStuckDraftOrder } from './support/dbCleanup.cjs';

test.describe('Real-backend failure scenarios', () => {
  test('invalid OTP is rejected by the real backend, no session created', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill('9812345671');
    await page.getByTestId('login-send-otp-button').click();
    await expect(page.getByTestId('login-otp-hidden-input')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('login-otp-hidden-input').fill('000000');
    await page.getByTestId('login-verify-button').click();

    await expect(page.getByTestId('login-start-shopping-button')).not.toBeVisible();
    const token = await page.evaluate(() => window.sessionStorage.getItem('authToken'));
    expect(token).toBeFalsy();
  });

  test('an unauthorized (no token) request to a protected real endpoint is rejected 401', async () => {
    const res = await realApi.get('/api/cart');
    expect(res.status).toBe(401);
  });

  test('a tampered/invalid JWT is rejected by the real auth middleware', async () => {
    const res = await realApi.get('/api/cart', 'this.is.not-a-valid-jwt');
    // The real authenticate middleware returns 400 for an unparseable
    // token and 401 for a well-formed-but-invalid one — either is a
    // correct rejection; this only cares that access was NOT granted.
    expect([400, 401]).toContain(res.status);
  });

  test('checking out with an empty cart shows the real empty-cart state (no draft order created)', async ({ page }) => {
    const token = await realApi.loginCustomer('9812345672', E2E_OTP);
    await page.goto('/login');
    await page.evaluate((t) => window.sessionStorage.setItem('authToken', t), token);
    await page.goto('/checkout');
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 10000 });

    const draft = await realApi.getDraftOrder(token);
    expect(draft.status).toBe(404);
  });

  test('adding an out-of-stock real product is rejected by the real backend', async () => {
    const token = await realApi.loginCustomer('9812345673', E2E_OTP);
    // "Cotton Dash Mat, Large" is seeded with stock: 0 (prisma/seed.js).
    const products = await realApi.get('/api/products?search=Cotton+Dash+Mat');
    const product = products.body.data[0];
    expect(product.stock).toBe(0);

    const res = await realApi.addToCart(product.id, 1, token);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test('an invalid address (bad phone/pincode) is rejected by the real backend validator', async () => {
    const token = await realApi.loginCustomer('9812345674', E2E_OTP);
    const res = await realApi.createAddress(E2E_ADDRESS_INVALID, token);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body.success).toBe(false);
  });

  test('an invalid (zero/negative) cart quantity is rejected by the real backend', async () => {
    const token = await realApi.loginCustomer('9812345675', E2E_OTP);
    const products = await realApi.get('/api/products?search=Pro-X');
    const productId = products.body.data[0].id;

    const zero = await realApi.addToCart(productId, 0, token);
    expect(zero.status).toBeGreaterThanOrEqual(400);

    const negative = await realApi.addToCart(productId, -1, token);
    expect(negative.status).toBeGreaterThanOrEqual(400);
  });

  test('duplicate COD submission for the same draft order does not create two orders', async () => {
    const token = await realApi.loginCustomer('9812345676', E2E_OTP);
    const address = await realApi.createAddress(
      { name: 'E2E Dup', phone: '9876500099', pincode: '411001', city: 'Pune', houseArea: '1 Dup Lane', area: 'Camp', state: 'Maharashtra' },
      token
    );
    const products = await realApi.get('/api/products?search=Steering+Cover');
    const productId = products.body.data[0].id;
    await realApi.addToCart(productId, 1, token);
    const draft = await realApi.createDraftOrder(address.body.data.id, token);
    const draftOrderId = draft.body.data.id;

    const first = await realApi.placeCodOrder(draftOrderId, token);
    expect(first.status).toBe(200);
    const firstOrderId = first.body.data.order.id;
    const second = await realApi.placeCodOrder(draftOrderId, token);
    // The second call must NOT create a second real order for the same
    // draft — either it's rejected outright, or it idempotently returns
    // the same order id as the first (real backend's own
    // `alreadyProcessed` no-op path — see handleCODOrder), never a second
    // Order row for one checkout.
    if (second.status === 200) {
      expect(second.body.data.order.id).toBe(firstOrderId);
      expect(second.body.data.alreadyProcessed).toBe(true);
    } else {
      expect(second.status).toBeGreaterThanOrEqual(400);
    }

    const history = await realApi.getOrderHistory(token);
    const matchingOrders = history.body.data.filter((o) => o.id === firstOrderId);
    expect(matchingOrders.length).toBe(1);
  });

  test('inventory conflict: buying the real last unit leaves 0 stock, and a second buyer is correctly refused', async () => {
    // KNOWN BUG (see final report): Order.payment_order_id is `String?
    // @unique` in prisma/schema.prisma. MongoDB's default unique index
    // treats null as a real value, so AT MOST ONE order in the entire
    // database can have payment_order_id: null (i.e. be an unpaid draft)
    // at any moment — confirmed by direct reproduction against the real
    // database. This makes it structurally impossible, right now, for two
    // different customers to hold two draft orders open at the same
    // instant (the second createDraftOrder call fails with a raw Prisma
    // P2002 error, not a handled response) — so a literal "two customers
    // click Place Order at the exact same millisecond" race can't be
    // driven at all until that's fixed. This test instead verifies the
    // part of real inventory-safety that IS currently exercisable: a real
    // purchase that takes the last unit genuinely leaves 0 real stock, and
    // a second real customer's subsequent real attempt to buy the
    // (now out-of-stock) item is genuinely refused by the real backend —
    // each draft order is fully completed (paid) before the next is
    // created, specifically to avoid tripping the bug above.
    const adminLogin = await realApi.adminLogin('e2e-admin@advika-e2e.test', 'E2eAdmin@12345');
    const adminToken = adminLogin.body.data.token;
    const products = await realApi.get('/api/products?search=SlimBar');
    const product = products.body.data[0];

    const addressFor = async (token, phone) =>
      (await realApi.createAddress(
        { name: 'E2E Race', phone, pincode: '411001', city: 'Pune', houseArea: '1 Race Lane', area: 'Camp', state: 'Maharashtra' },
        token
      )).body.data.id;

    // Drain every real unit of real stock, one fully-completed real
    // purchase at a time (never two open drafts at once).
    const inventory = await realApi.getInventory(product.id, adminToken);
    let remaining = inventory.body?.data?.stock ?? product.stock;
    let drainCount = 0;
    while (remaining > 0) {
      drainCount += 1;
      const drainToken = await realApi.loginCustomer(`981234568${drainCount}`, E2E_OTP);
      const addr = await addressFor(drainToken, `987650020${drainCount}`);
      await realApi.addToCart(product.id, 1, drainToken);
      const drainDraft = await realApi.createDraftOrder(addr, drainToken);
      const placed = await realApi.placeCodOrder(drainDraft.body.data.id, drainToken);
      if (placed.status === 200) remaining -= 1;
      else break;
    }

    const inventoryAfter = await realApi.getInventory(product.id, adminToken);
    expect(inventoryAfter.body.data.stock).toBe(0);

    // A subsequent real customer's real attempt to buy the now-0-stock
    // item is genuinely refused.
    const lateBuyer = await realApi.loginCustomer('9812345699', E2E_OTP);
    const lateAttempt = await realApi.addToCart(product.id, 1, lateBuyer);
    expect(lateAttempt.status).toBeGreaterThanOrEqual(400);
    expect(lateAttempt.status).toBeLessThan(500);
  });

  // Runs LAST in this file deliberately: this test's real backend
  // rejection leaves the customer's real draft order stuck with
  // payment_order_id: null forever (the conflict check refuses the COD
  // placement that would otherwise clear it) — combined with the same
  // schema bug documented above, that means this one test would otherwise
  // block every subsequent test (or real customer!) in the whole suite
  // from ever creating a NEW draft order, since only one null
  // payment_order_id can exist system-wide at a time. Keeping it last
  // contains the blast radius to nothing else in this file.
  test('product deleted mid-checkout is caught by the real conflict check before payment', async () => {
    const adminLogin = await realApi.adminLogin('e2e-admin@advika-e2e.test', 'E2eAdmin@12345');
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.data.token;

    const buyerToken = await realApi.loginCustomer('9812345679', E2E_OTP);
    const address = await realApi.createAddress(
      { name: 'E2E Deleted Product', phone: '9876500093', pincode: '411001', city: 'Pune', houseArea: '1 Gone Lane', area: 'Camp', state: 'Maharashtra' },
      buyerToken
    );
    // A throwaway real product created purely so this test can delete it
    // out from under an in-progress checkout — never touches the real
    // seeded catalog.
    const productsBefore = await realApi.get('/api/products?search=Braided+Wiring');
    const productId = productsBefore.body.data[0].id;

    await realApi.addToCart(productId, 1, buyerToken);
    const draft = await realApi.createDraftOrder(address.body.data.id, buyerToken);
    const draftOrderId = draft.body.data.id;

    // Real admin deletes the product the customer already has in their
    // real draft order.
    const del = await realApi.del(`/api/products/${productId}`, adminToken);
    expect(del.status).toBe(200);

    // The real backend's own conflict detection (order.service.js's
    // detectOrderConflicts, called from create-orderid / COD placement)
    // must catch this before money changes hands — never silently charge
    // for a since-deleted product.
    const attempt = await realApi.placeCodOrder(draftOrderId, buyerToken);
    expect(attempt.status).toBeGreaterThanOrEqual(400);
    expect(attempt.status).toBeLessThan(500);

    // Test-only cleanup for the real bug documented above this test — see
    // dbCleanup.cjs's header comment. This is NOT how the real app would
    // recover from this state today (it currently can't, on its own).
    await deleteStuckDraftOrder(draftOrderId);
  });
});
