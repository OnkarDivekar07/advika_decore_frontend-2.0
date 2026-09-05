// e2e-real/refresh-recovery.spec.js — REAL FULL-STACK E2E.
//
// Pattern 20 (browser refresh/navigation/recovery audit): CheckoutContext.jsx
// already has real, carefully-documented logic for "a refresh landed while a
// payment attempt was in flight" — pendingPaymentOrderId is saved to
// sessionStorage right before any request that can move money, and a
// restore-on-mount effect checks that specific order's real status before
// falling back to the normal draft-order restore, so a customer refreshing
// after their order actually confirmed (COD response lost, or an online
// payment's webhook reconciled before the tab reloaded) lands on the real
// success page instead of a stale payment form that could tempt a second,
// duplicate charge. That mechanism had unit-test coverage (CheckoutContext.test.jsx,
// mocked) but had never been proven against a real reload + the real
// backend. These two tests do that, without needing to actually interrupt a
// live request mid-flight (not reliably possible without route
// interception, which would mock the very app boundary this task forbids
// mocking): each one places a REAL order server-side first — exactly what
// "the request succeeded but this tab never saw the response" looks like
// from the browser's point of view — then recreates the sessionStorage
// marker CheckoutContext itself would have written, and does a REAL
// navigation/reload to prove the real restore logic recovers correctly.
import { test, expect } from '@playwright/test';
import realApi from './support/realApi.js';
import { E2E_CUSTOMER_PHONE, E2E_OTP, E2E_ADDRESS } from './fixtures/e2eData.js';
import { buildSignedRazorpayWebhook } from '../../backend 2.0/tests/e2e-helpers/signRazorpayWebhook.js';

const RAZORPAY_WEBHOOK_SECRET = 'e2e-razorpay-webhook-secret-for-simulated-events'; // must match backend 2.0/.env.e2e

// Writes the exact sessionStorage shape checkoutStorage.js's saveCheckoutState
// produces — not a shortcut/mock, just recreating what the real code already
// writes at this exact moment (see CheckoutContext.jsx's placeCODOrder/
// payOnline, both of which save this before their request even goes out).
async function simulateInterruptedTab(page, { selectedAddressId, pendingPaymentOrderId, paymentMethod }) {
  await page.evaluate(
    ({ selectedAddressId, pendingPaymentOrderId, paymentMethod }) => {
      window.sessionStorage.setItem(
        'checkoutState',
        JSON.stringify({
          selectedAddressId,
          pendingPaymentOrderId,
          reviewConfirmed: true,
          step: 'payment',
          paymentMethod,
        })
      );
    },
    { selectedAddressId, pendingPaymentOrderId, paymentMethod }
  );
}

test('a refresh right after a COD order actually confirmed lands on the real success page, not a duplicate-charge risk', async ({ page }) => {
  const token = await realApi.loginCustomer(E2E_CUSTOMER_PHONE, E2E_OTP);
  expect(token).toBeTruthy();

  const address = await realApi.createAddress(
    { ...E2E_ADDRESS, phone: '9876500096', houseArea: `${Date.now()} Refresh-Recovery COD Lane` },
    token
  );
  expect([200, 201]).toContain(address.status);
  const addressId = address.body.data.id;

  const products = await realApi.get('/api/products?search=Pro-X');
  const productId = products.body.data[0].id;
  await realApi.addToCart(productId, 1, token);
  const draft = await realApi.createDraftOrder(addressId, token);
  expect(draft.status).toBe(201);
  const orderId = draft.body.data.id;

  // This IS "the request that actually confirms the order" — placed for
  // real, server-side, exactly as CheckoutContext's placeCODOrder would
  // have, standing in for "the response never made it back to this tab".
  const placed = await realApi.placeCodOrder(orderId, token);
  expect(placed.status).toBe(200);

  const confirmedCheck = await realApi.getOrder(orderId, token);
  expect(confirmedCheck.body.data.status).toBe('confirmed');
  expect(confirmedCheck.body.data.paymentStatus).toBe('cod_pending');

  // Now the "interrupted tab": a real session for this same user, with the
  // exact sessionStorage marker the real code would have left, doing a
  // real navigation to the payment step.
  await page.goto('/login');
  await page.evaluate((t) => window.sessionStorage.setItem('authToken', t), token);
  await simulateInterruptedTab(page, {
    selectedAddressId: addressId,
    pendingPaymentOrderId: orderId,
    paymentMethod: 'cod',
  });
  await page.goto('/checkout/payment');

  // The real restore-on-mount effect should redirect straight to the real
  // success page for this specific order — never leave the customer on a
  // payment form for an order that's already confirmed.
  await page.waitForURL(new RegExp(`/order/success/${orderId}`), { timeout: 15000 });
  await expect(page.getByText(`#${orderId}`).first()).toBeVisible({ timeout: 10000 });

  // === DATABASE: no duplicate order was created by any of this ===
  const draftAfter = await realApi.getDraftOrder(token);
  // Either no draft at all, or (if the cart still had something queued) a
  // fresh one that is NOT this same already-placed order.
  if (draftAfter.status === 200) {
    expect(draftAfter.body.data.id).not.toBe(orderId);
  }
  const orderStillOnce = await realApi.getOrder(orderId, token);
  expect(orderStillOnce.body.data.status).toBe('confirmed');
  expect(orderStillOnce.body.data.paymentStatus).toBe('cod_pending');
});

test('a refresh right after a webhook reconciled an online payment lands on the real success page, not a second payment attempt', async ({ page }) => {
  const token = await realApi.loginCustomer(E2E_CUSTOMER_PHONE, E2E_OTP);
  expect(token).toBeTruthy();

  const address = await realApi.createAddress(
    { ...E2E_ADDRESS, phone: '9876500097', houseArea: `${Date.now()} Refresh-Recovery Online Lane` },
    token
  );
  expect([200, 201]).toContain(address.status);
  const addressId = address.body.data.id;

  const products = await realApi.get('/api/products?search=Pro-X');
  const productId = products.body.data[0].id;
  await realApi.addToCart(productId, 1, token);
  const draft = await realApi.createDraftOrder(addressId, token);
  expect(draft.status).toBe(201);
  const orderId = draft.body.data.id;

  const created = await realApi.createRazorpayOrder(token);
  expect(created.status).toBe(200);
  const razorpayOrderId = created.body.data.order.id;
  const amountPaise = created.body.data.order.amount;

  // This IS "the webhook that reconciled the payment" — the real backstop
  // per checkout-architecture.md §3.2, firing for real before the browser
  // ever gets back to this tab (network drop, closed tab, or simply a
  // refresh right as the Razorpay modal's own handler fired).
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

  const confirmedCheck = await realApi.getOrder(orderId, token);
  expect(confirmedCheck.body.data.status).toBe('confirmed');
  expect(confirmedCheck.body.data.paymentStatus).toBe('paid');

  await page.goto('/login');
  await page.evaluate((t) => window.sessionStorage.setItem('authToken', t), token);
  await simulateInterruptedTab(page, {
    selectedAddressId: addressId,
    pendingPaymentOrderId: orderId,
    paymentMethod: 'online',
  });
  await page.goto('/checkout/payment');

  await page.waitForURL(new RegExp(`/order/success/${orderId}`), { timeout: 15000 });
  await expect(page.getByText(`#${orderId}`).first()).toBeVisible({ timeout: 10000 });

  // === DATABASE: no second Razorpay order / no double payment ===
  const orderStillOnce = await realApi.getOrder(orderId, token);
  expect(orderStillOnce.body.data.paymentStatus).toBe('paid');
  expect(orderStillOnce.body.data.payment_id).toBe(webhook.paymentId);
});
