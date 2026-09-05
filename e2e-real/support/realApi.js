// e2e-real/support/realApi.js
//
// The core difference between this "real" layer and the existing mocked
// e2e/ suite: NOTHING here uses page.route()/route.fulfill(). Every
// function in this file makes a genuine HTTP request (via Node's built-in
// fetch, run by Playwright's own Node process — not intercepted in the
// browser) straight to the real backend started via
// `backend 2.0` -> `npm run e2e:server`. It exists so specs can:
//   1. Verify results through the real API after a real UI action (per the
//      task's own rule: "verify important results through the real
//      API/backend, not just by checking visible text").
//   2. Drive the one or two steps (Razorpay order creation for the
//      payment-simulation test, admin setup calls) that are clearer and
//      more reliable done as a direct authenticated API call than by
//      driving through UI widgets that don't matter to what's being
//      tested.
//
// Auth tokens used here are always real JWTs a real login (OTP or admin
// password) actually issued — normally captured out of the browser's own
// sessionStorage/localStorage after a real UI login (see customer-journey
// spec), never fabricated.
const API_BASE = process.env.E2E_REAL_API_URL || 'http://localhost:5001';

async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

const realApi = {
  API_BASE,

  get: (path, token) => request('GET', path, { token }),
  post: (path, body, token) => request('POST', path, { token, body }),
  put: (path, body, token) => request('PUT', path, { token, body }),
  patch: (path, body, token) => request('PATCH', path, { token, body }),
  del: (path, token) => request('DELETE', path, { token }),

  // --- Convenience wrappers over the real endpoints this suite cares about ---
  getCart: (token) => request('GET', '/api/cart', { token }),
  getProduct: (id) => request('GET', `/api/products/${id}`),
  getDraftOrder: (token) => request('GET', '/api/order', { token }),
  getOrder: (id, token) => request('GET', `/api/order/${id}`, { token }),
  getOrderHistory: (token) => request('GET', '/api/order/history', { token }),
  getInventory: (productId, token) =>
    request('GET', `/api/inventory/${productId}`, { token }),
  createDraftOrder: (selectedAddressId, token) =>
    request('POST', '/api/order', { token, body: { selectedAddressId } }),
  // Public — no token needed. Pattern 19 (cross-system full lifecycle):
  // "address is created and serviceability passes" is its own checkable
  // step, not just an assumption baked into checkout succeeding.
  checkServiceability: (pincode) =>
    request('POST', '/api/shipping/serviceability', { body: { pincode } }),
  // The real address validator requires E.164 phone format too (same
  // +91[6-9]\d{9} regex as OTP — confirmed against the real backend). The
  // real AddressForm.jsx already converts a bare 10-digit UI input to
  // E.164 before POSTing (via its own toE164 helper); this direct-API
  // helper does the same so callers can keep passing plain 10-digit
  // numbers, matching what a real user actually types.
  createAddress: (address, token) =>
    request('POST', '/api/user/address', {
      token,
      body: {
        ...address,
        phone: address.phone.startsWith('+91') ? address.phone : `+91${address.phone}`,
      },
    }),
  // PUT /api/cart (cartService.updateCartItem) is an upsert that SETS the
  // line's quantity to exactly what's given (not an increment) — confirmed
  // against the real backend. POST /api/cart is a different endpoint
  // entirely (saveUserCart, replaces the WHOLE cart from a `cartItems`
  // array) and is not what a single add-to-cart action should call.
  addToCart: (productId, quantity, token) =>
    request('PUT', '/api/cart', { token, body: { productId, quantity } }),
  createRazorpayOrder: (token) =>
    request('POST', '/api/payment/create-orderid', { token }),
  // handleCODOrder (payment.service.js) requires the draft order's own id
  // in the body — it is NOT inferred from the authenticated user alone.
  placeCodOrder: (orderId, token) =>
    request('POST', '/api/payment/cod', { token, body: { orderId, method: 'cod' } }),

  // Real admin login (email/password) — used by the cross-system spec's
  // admin-side setup/verification calls that don't need the admin UI open.
  adminLogin: (email, password) =>
    request('POST', '/api/admin/login', { body: { email, password } }),

  // Real phone+OTP login, done purely over the API (real
  // /api/otp/send-otp + /api/otp/verify-otp against the real backend/mock
  // MSG91 server) — for specs whose focus isn't the login UI itself (e.g.
  // payment-razorpay.spec.js), so they don't have to re-drive the login
  // form just to get a token. customer-journey.spec.js still exercises the
  // real login UI directly — this is a second, equally real path to the
  // same endpoints, not a mock.
  // The real /api/otp/* validators require the +91-prefixed E.164 form
  // (confirmed against the real backend — a bare 10-digit number is
  // rejected with a 422). The real LoginPage UI already formats this
  // itself before calling the API (real customer-journey.spec.js drives
  // that UI directly with a bare number, same as a real user would type),
  // but this API-only helper talks to the endpoint directly, so it has to
  // do that formatting itself.
  async loginCustomer(phone, otp) {
    const e164 = phone.startsWith('+91') ? phone : `+91${phone}`;
    await request('POST', '/api/otp/send-otp', { body: { phone: e164 } });
    const verify = await request('POST', '/api/otp/verify-otp', {
      body: { phone: e164, otp },
    });
    return verify.body?.data?.token;
  },
};

export default realApi;
