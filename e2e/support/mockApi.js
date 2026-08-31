// e2e/support/mockApi.js
//
// Playwright route-interception layer standing in for the real backend.
// Why interception instead of a live backend: this suite runs in a
// sandboxed environment with no reachable MongoDB (see repo root README /
// final test report for details) — but per the task's own test-stability
// guidance ("Prefer: API fixtures... Database seeding") intercepting the
// network boundary with fixtures matching the REAL backend's documented
// response contracts is a legitimate, standard E2E technique. It also
// makes every scenario (empty results, 500s, stock conflicts, payment
// failure, rate limiting) deterministic and instant instead of depending
// on live third-party state (Razorpay, MSG91, Delhivery) this app talks to.
//
// Every fixture shape here is derived from backend/src/modules/**
// (routes/controllers/services) as documented in the E2E test report —
// not invented. Update fixtures/data.js if the backend contract changes.
import { PRODUCTS, PRODUCT_1, ADDRESS_1, USER, VALID_TOKEN, envelope, errorEnvelope } from '../fixtures/data.js';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:5000';

/** Fulfill a route with a JSON envelope + status. */
async function json(route, status, body) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * Install baseline "happy path" mocks for every API area this app calls.
 * Call this first in a test, then use the per-area helpers below to
 * override specific endpoints for the scenario under test (page.route's
 * last-registered handler for an overlapping pattern wins in Playwright,
 * so overrides registered after this still take effect).
 */
async function installDefaultMocks(page) {
  // Safety net: abort any request to a real external host instead of
  // letting it go out. This sandbox's network egress is a strict
  // allowlist — a request to an unlisted host (Razorpay's checkout.js,
  // any third-party font/analytics/CDN script) doesn't fail fast, it
  // hangs until the browser's own connection timeout, which is long
  // enough to stall page.goto()/reload() waiting for the 'load' event.
  // Aborting immediately keeps every test's timing deterministic
  // regardless of what a given page happens to load.
  await page.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
    (route) => route.abort()
  );

  let cart = { items: [] }; // in-memory per-test cart state, product-id keyed
  let addresses = [{ ...ADDRESS_1 }];
  let wishlist = [];

  // ---- Products ---------------------------------------------------------
  await page.route(`${API_BASE}/api/products?**`, async (route) => {
    const url = new URL(route.request().url());
    const search = (url.searchParams.get('search') || '').toLowerCase();
    let list = PRODUCTS;
    if (search) {
      list = list.filter((p) => p.name.toLowerCase().includes(search));
    }
    await json(route, 200, envelope(list, {
      total: list.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    }));
  });
  await page.route(`${API_BASE}/api/products`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await json(route, 200, envelope(PRODUCTS, {
      total: PRODUCTS.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    }));
  });
  await page.route(`${API_BASE}/api/products/batch?**`, async (route) => {
    await json(route, 200, envelope(PRODUCTS));
  });
  for (const product of PRODUCTS) {
    await page.route(`${API_BASE}/api/products/${product.id}`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await json(route, 200, envelope(product));
    });
    await page.route(`${API_BASE}/api/products/${product.id}/related`, async (route) => {
      await json(route, 200, envelope(PRODUCTS.filter((p) => p.id !== product.id)));
    });
  }

  // ---- Homepage -----------------------------------------------------------
  await page.route(`${API_BASE}/api/homepage/banners`, async (route) => {
    await json(route, 200, envelope([], { total: 0, page: 1, limit: 10, totalPages: 0 }));
  });
  await page.route(`${API_BASE}/api/homepage/new-arrivals?**`, async (route) => {
    await json(route, 200, envelope([PRODUCTS[1]], { total: 1, page: 1, limit: 10, totalPages: 1 }));
  });

  // ---- Shipping -----------------------------------------------------------
  await page.route(`${API_BASE}/api/shipping/delivery-config`, async (route) => {
    await json(route, 200, envelope({ freeDeliveryThreshold: 600, deliveryCharge: 49 }));
  });
  await page.route(`${API_BASE}/api/shipping/serviceability`, async (route) => {
    const body = route.request().postDataJSON();
    if (!/^\d{6}$/.test(body?.pincode || '')) {
      return json(route, 200, envelope({
        serviceable: false,
        reason: 'INVALID_FORMAT',
        estimatedDays: null,
        codAvailable: false,
      }));
    }
    await json(route, 200, envelope({
      serviceable: true,
      reason: null,
      estimatedDays: 3,
      estimatedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      codAvailable: true,
    }));
  });

  // ---- OTP / auth -----------------------------------------------------------
  await page.route(`${API_BASE}/api/otp/send-otp`, async (route) => {
    await json(route, 200, envelope(null, {}));
  });
  await page.route(`${API_BASE}/api/otp/verify-otp`, async (route) => {
    const body = route.request().postDataJSON();
    if (body?.otp !== '123456') {
      return json(route, 400, errorEnvelope('Invalid OTP'));
    }
    await json(route, 200, {
      success: true,
      message: 'ok',
      token: VALID_TOKEN,
      user: { id: USER.id, phone: USER.phone },
      data: { token: VALID_TOKEN, user: { id: USER.id, phone: USER.phone } },
      meta: { timestamp: new Date().toISOString() },
    });
  });

  // ---- User / addresses ---------------------------------------------------
  await page.route(`${API_BASE}/api/user/profile`, async (route) => {
    if (route.request().method() === 'GET') {
      return json(route, 200, envelope(USER));
    }
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      return json(route, 200, envelope({ ...USER, ...body }));
    }
    return route.fallback();
  });
  await page.route(`${API_BASE}/api/user/addresses`, async (route) => {
    await json(route, 200, envelope(addresses));
  });
  await page.route(`${API_BASE}/api/user/address`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    const created = { id: `addr_${addresses.length + 1}`, ...body };
    addresses = [...addresses, created];
    await json(route, 200, envelope(created));
  });
  await page.route(`${API_BASE}/api/user/address/*`, async (route) => {
    const method = route.request().method();
    const id = route.request().url().split('/').pop();
    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      addresses = addresses.map((a) => (a.id === id ? { ...a, ...body } : a));
      return json(route, 200, envelope(addresses.find((a) => a.id === id)));
    }
    if (method === 'DELETE') {
      addresses = addresses.filter((a) => a.id !== id);
      return json(route, 200, envelope(null));
    }
    return route.fallback();
  });
  await page.route(`${API_BASE}/api/user/address/*/default`, async (route) => {
    const id = route.request().url().split('/')[route.request().url().split('/').length - 2];
    addresses = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    await json(route, 200, envelope(addresses));
  });

  // ---- Cart -----------------------------------------------------------------
  const cartSummary = () => {
    const subtotal = cart.items.reduce((sum, i) => {
      const p = PRODUCTS.find((pr) => pr.id === i.productId);
      return sum + (p ? p.price * i.quantity : 0);
    }, 0);
    const deliveryCharge = subtotal >= 600 || subtotal === 0 ? 0 : 49;
    return { subtotal, deliveryCharge, total: subtotal + deliveryCharge };
  };
  const cartResponse = () =>
    envelope(
      cart.items.map((i) => ({
        ...i,
        product: PRODUCTS.find((p) => p.id === i.productId),
      })),
      { summary: cartSummary() }
    );

  await page.route(`${API_BASE}/api/cart`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') return json(route, 200, cartResponse());
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      cart.items = body.cartItems || [];
      return json(route, 200, cartResponse());
    }
    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      const product = PRODUCTS.find((p) => p.id === body.productId);
      if (product && product.stock === 0) {
        return json(route, 400, errorEnvelope('This product is out of stock'));
      }
      const existing = cart.items.find((i) => i.productId === body.productId);
      if (existing) existing.quantity = body.quantity;
      else cart.items.push({ productId: body.productId, quantity: body.quantity });
      return json(route, 200, cartResponse());
    }
    if (method === 'DELETE') {
      const body = route.request().postDataJSON();
      cart.items = cart.items.filter((i) => i.productId !== body.productId);
      return json(route, 200, cartResponse());
    }
    return route.fallback();
  });
  await page.route(`${API_BASE}/api/cart/coupon`, async (route) => {
    await json(route, 404, errorEnvelope('Invalid coupon code'));
  });

  // ---- Wishlist ---------------------------------------------------------
  await page.route(`${API_BASE}/api/wishlist`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return json(route, 200, envelope(
        wishlist.map((id) => ({ productId: id, product: PRODUCTS.find((p) => p.id === id) }))
      ));
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      if (!wishlist.includes(body.productId)) wishlist.push(body.productId);
      return json(route, 200, envelope({ productId: body.productId }));
    }
    return route.fallback();
  });
  await page.route(`${API_BASE}/api/wishlist/*`, async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const id = route.request().url().split('/').pop();
    wishlist = wishlist.filter((pid) => pid !== id);
    await json(route, 200, envelope(null));
  });

  // ---- Order / payment (happy path defaults; override per-scenario) -----
  // `let`, not `const`: the /api/payment/cod handler below flips this to a
  // confirmed order once COD is placed, so a subsequent GET /api/order/:id
  // (OrderSuccessPage, OrderTrackingPage) sees the real post-placement
  // state instead of a stale 'draft'.
  let draftOrder = {
    id: 'order_draft_1',
    status: 'draft',
    paymentStatus: 'pending',
    addressId: ADDRESS_1.id,
    subtotal: 2499,
    deliveryCharge: 0,
    discount: 0,
    total: 2499,
    orderItems: [{ productId: PRODUCT_1.id, quantity: 1, price: PRODUCT_1.price, product: PRODUCT_1 }],
  };
  await page.route(`${API_BASE}/api/order`, async (route) => {
    const method = route.request().method();
    if (method === 'POST') return json(route, 201, envelope(draftOrder));
    if (method === 'GET') return json(route, 200, envelope(draftOrder));
    return route.fallback();
  });
  // GET a single order by id (order.service.js#getOrderById) — needed by
  // OrderSuccessPage and OrderTrackingPage. Serves whichever order this
  // in-memory `draftOrder` currently represents (the draft, or — once COD
  // has been placed via the handler below — the same object flipped to
  // 'confirmed'), 404 for any other id. A test needing a 403 (someone
  // else's order) or a specific different 200 fixture registers its own
  // override for that exact id AFTER installDefaultMocks, which wins per
  // this file's own last-registered-wins rule.
  //
  // Registered BEFORE /api/order/history below on purpose: Playwright
  // tries the most-recently-registered matching handler first, and this
  // pattern's `*` also matches "history?page=1&limit=10" as a single
  // path segment — so /api/order/history's own dedicated handler has to
  // be registered *after* this one to win for its own URL, exactly like
  // any other override in this file.
  await page.route(`${API_BASE}/api/order/*`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const id = route.request().url().split('/').pop();
    if (id === draftOrder.id) return json(route, 200, envelope(draftOrder));
    return json(route, 404, errorEnvelope('Order not found'));
  });
  await page.route(`${API_BASE}/api/order/history?**`, async (route) => {
    await json(route, 200, envelope([], { total: 0, page: 1, limit: 10, totalPages: 0 }));
  });
  await page.route(`${API_BASE}/api/payment/create-orderid`, async (route) => {
    await json(route, 200, envelope({
      order: { id: 'rzp_order_1', amount: draftOrder.total * 100, currency: 'INR' },
      key_id: 'rzp_test_dummy',
    }));
  });
  await page.route(`${API_BASE}/api/payment/cod`, async (route) => {
    // Real contract (payment.service.js's handleCODOrder, mirrored by
    // CheckoutContext.placeCODOrder's `result.order`) returns the placed
    // order itself, not just its id — flip this shared draftOrder to
    // 'confirmed' so the redirect to /order/success/:id and any later
    // GET /api/order/:id (tracking) both see it as actually placed.
    draftOrder = {
      ...draftOrder,
      status: 'confirmed',
      paymentStatus: 'cod_pending',
      payment_order_id: `cod-${draftOrder.id}`,
    };
    await json(route, 200, envelope({ order: draftOrder, alreadyProcessed: false }));
  });
  await page.route(`${API_BASE}/api/payment/verify`, async (route) => {
    await json(route, 200, envelope({ success: true, alreadyProcessed: false, orderId: draftOrder.id }));
  });

  return { cart, addresses: () => addresses, draftOrder };
}

/**
 * Seed a logged-in session directly into sessionStorage (bypassing the
 * OTP UI flow) for tests whose focus is NOT authentication itself — the
 * OTP flow gets its own dedicated spec. Matches src/utils/authUtils.js's
 * storage contract exactly (AUTH_TOKEN_KEY='authToken', AUTH_USER_KEY='authUser').
 */
async function loginAs(page, { token = VALID_TOKEN, user = { id: USER.id, phone: USER.phone } } = {}) {
  await page.addInitScript(
    ([t, u]) => {
      window.sessionStorage.setItem('authToken', t);
      window.sessionStorage.setItem('authUser', JSON.stringify(u));
    },
    [token, user]
  );
}

export { installDefaultMocks, loginAs, json, API_BASE };
