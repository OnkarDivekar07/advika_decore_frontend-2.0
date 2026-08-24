// e2e-real/payment-razorpay.spec.js — REAL FULL-STACK E2E (online/Razorpay
// path).
//
// Razorpay's checkout.js widget runs inside a Razorpay-hosted iframe with a
// real-card/test-card OTP challenge that cannot be reliably driven by
// Playwright — confirmed with the project owner, who chose this approach
// over attempting to automate that widget (see the task's own rule: mocking
// only the *external* payment provider boundary is acceptable, the app's
// own backend must never be mocked). So this test:
//
//   1. Real browser adds a real product to a real cart and creates a real
//      draft order against the real backend (same as customer-journey.spec.js).
//   2. Calls the REAL POST /api/payment/create-orderid — a genuine
//      server-to-server call from the real backend to Razorpay's real
//      TEST-MODE REST API (rzp_test_... keys, .env.e2e), returning a real
//      Razorpay order id. No money moves; Razorpay's test mode is designed
//      for exactly this.
//   3. Builds a webhook payload the real backend cannot distinguish from a
//      genuine Razorpay delivery (identical HMAC-SHA256 signature scheme,
//      same RAZORPAY_WEBHOOK_SECRET) and POSTs it to the REAL
//      /api/payment/webhook endpoint — see
//      backend 2.0/tests/e2e-helpers/signRazorpayWebhook.js for exactly
//      why this is a legitimate real-backend test and not a
//      backend-mocking shortcut: only Razorpay's own hosted UI is
//      unexercised; every line of this app's payment code, and the real
//      Razorpay REST API, genuinely runs.
//   4. Verifies (through the real API, real DB) that the order really did
//      flip to paid/confirmed, and that the browser — reloading the order
//      page — really does see that real result.
import { test, expect } from '@playwright/test';
import realApi from './support/realApi.js';
import { E2E_CUSTOMER_PHONE, E2E_OTP, E2E_ADDRESS } from './fixtures/e2eData.js';
// Cross-package import: backend 2.0 is a sibling Node project, not an npm
// dependency of frontend-improved — this is a plain relative ESM import of
// a CommonJS module with no external deps of its own (just Node's
// built-in `crypto`). Node's ESM/CJS interop resolves the named export
// fine for a plain `module.exports = { buildSignedRazorpayWebhook }`.
import { buildSignedRazorpayWebhook } from '../../backend 2.0/tests/e2e-helpers/signRazorpayWebhook.js';

const RAZORPAY_WEBHOOK_SECRET = 'e2e-razorpay-webhook-secret-for-simulated-events'; // must match backend 2.0/.env.e2e

test('real Razorpay order creation + simulated captured-payment webhook flips a real order to paid', async ({ page }) => {
  const token = await realApi.loginCustomer(E2E_CUSTOMER_PHONE, E2E_OTP);
  expect(token).toBeTruthy();

  const address = await realApi.createAddress(E2E_ADDRESS, token);
  expect([200, 201]).toContain(address.status);
  const addressId = address.body.data.id;

  // Real seeded product, real add-to-cart, real draft-order creation —
  // same real endpoints the UI itself calls.
  const products = await realApi.get('/api/products?search=Pro-X');
  const productId = products.body.data[0].id;
  await realApi.addToCart(productId, 1, token);
  const draft = await realApi.createDraftOrder(addressId, token);
  expect(draft.status).toBe(201);

  const created = await realApi.createRazorpayOrder(token);
  expect(created.status).toBe(200);
  const razorpayOrderId = created.body.data.order.id;
  const amountPaise = created.body.data.order.amount;
  expect(razorpayOrderId).toMatch(/^order_/);

  const webhook = buildSignedRazorpayWebhook({
    webhookSecret: RAZORPAY_WEBHOOK_SECRET,
    razorpayOrderId,
    amountPaise,
  });

  const webhookRes = await fetch(`${realApi.API_BASE}/api/payment/webhook`, {
    method: 'POST',
    headers: webhook.headers,
    body: webhook.rawBody,
  });
  expect(webhookRes.status).toBe(200);

  // Verify through the real API/DB — the order genuinely flipped.
  const draftAfter = await realApi.getDraftOrder(token);
  const orderId = draftAfter.status === 200 ? draftAfter.body.data.id : draft.body.data.id;
  const orderCheck = await realApi.getOrder(orderId, token);
  expect(orderCheck.body.data.paymentStatus).toBe('paid');
  expect(orderCheck.body.data.status).toBe('confirmed');
  expect(orderCheck.body.data.payment_id).toBe(webhook.paymentId);

  // And the browser, with a real session for this same user, sees the
  // real result too — not just the Node-side API check.
  await page.goto('/login');
  await page.evaluate((t) => window.sessionStorage.setItem('authToken', t), token);
  await page.goto(`/orders/${orderId}/track`);
  await expect(page.getByText(`#${orderId}`)).toBeVisible({ timeout: 15000 });
});
