// src/services/paymentService.js
//
// Payment endpoints (see payment.routes.js). This layer's only job is
// getting money/COD requests to the backend and handing back what it
// says — the backend (and, for online payment, the Razorpay webhook) is
// the source of truth for whether an order actually got paid, never a
// computation done here. See checkout-architecture.md §1-3.
import apiClient from '@/utils/apiClient';

// --- Transient-failure retry ------------------------------------------
// A short, bounded retry for exactly the failures that are worth retrying:
// no response reached us at all (dropped connection, DNS blip, request
// timed out) or the backend itself errored (5xx) — never a definite 4xx
// (bad signature, wrong owner, stale draft, validation error), which would
// just fail the same way again. This matters most right after money has
// actually moved: Razorpay's handler has already fired, but the /verify
// call confirming it can still drop on a flaky connection — retrying that
// specific call is what stops a one-off network blip from surfacing as
// "payment failed" when it actually succeeded. Safe to do because every
// call this wraps is idempotent server-side (createOrderid reuses/
// reconciles instead of minting a new Razorpay order; /verify and /cod
// both no-op on a retry that lands after an earlier one already won — see
// their own docs), so a retry can never double-charge or double-place.
// Deliberately not applied at the apiClient layer itself — most endpoints
// in this app should NOT be silently retried (see checkout-architecture.md
// on why draft-order refreshes must reflect a real, single price/stock
// check) — so this stays scoped to just these three payment calls.
const isTransientError = (error) => {
  if (!error?.response) return true; // no HTTP response at all reached us
  return error.response.status >= 500;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTransientRetry = async (fn, { attempts = 2, baseDelayMs = 600 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientError(error) || attempt === attempts - 1) throw error;
      await wait(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
};

/**
 * Creates (or reuses, or reconciles) a Razorpay order sized to the user's
 * current draft order total. Safe to call again for the same draft order —
 * the backend reuses an existing not-yet-paid Razorpay order instead of
 * minting a new one (see payment.controller.js's createOrderid), so a retry
 * after a dropped connection or a double-tap never orphans a payment. A
 * transient network/5xx failure on this specific call is retried once
 * automatically (see withTransientRetry above) before the caller ever sees
 * it — nothing has been charged yet at this point either way, so there's
 * no risk in trying again.
 *
 * @returns {Promise<
 *   | { order: object, key_id: string, alreadyPaid?: false }
 *   | { alreadyPaid: true, orderId: string }
 * >} Normally `{ order, key_id }` — `order` is the Razorpay order object to
 *   hand to Checkout.js, `key_id` the public Razorpay key for the same
 *   call. If a previous attempt already succeeded (captured by Razorpay but
 *   never reconciled client-side), this instead comes back as
 *   `{ alreadyPaid: true, orderId }` — there's nothing left to pay, the
 *   caller should treat this the same as a completed payment.
 */
export const createRazorpayOrder = async () => {
  const { data } = await withTransientRetry(() => apiClient.post('/api/payment/create-orderid'));
  return data.data;
};

/**
 * Forwards Razorpay Checkout.js's callback payload for HMAC verification.
 * Best-effort UI feedback only — the webhook is the real backstop if the
 * client never gets to call this (tab closed, network died mid-payment).
 * Retried once on a transient network/5xx failure (see withTransientRetry
 * above) — this is the call most likely to hit exactly that right after a
 * real payment, and it's safely re-callable (see payment.service.js's
 * updateOrderAfterPayment — a no-op once already applied), so retrying it
 * here closes the single highest-value gap between "payment actually
 * succeeded" and "customer sees a failure" that this app can close without
 * waiting on the webhook.
 * @param {{ razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }} payload
 * @returns {Promise<{ success: boolean, alreadyProcessed: boolean, orderId: string }>}
 */
export const verifyPayment = async (payload) => {
  const { data } = await withTransientRetry(() => apiClient.post('/api/payment/verify', payload));
  return data.data;
};

/**
 * Retried once on a transient network/5xx failure, same reasoning as
 * verifyPayment above — handleCODOrder is idempotent (a retry after the
 * first call actually committed just comes back `alreadyProcessed: true`
 * instead of reserving stock twice), so there's nothing unsafe about
 * trying again here before the caller has to fall back to a manual retry.
 * @param {string} orderId
 * @returns {Promise<{ success: boolean, order: object, alreadyProcessed: boolean }>}
 */
export const placeCODOrder = async (orderId) => {
  const { data } = await withTransientRetry(() =>
    apiClient.post('/api/payment/cod', { orderId, method: 'cod' })
  );
  return data.data;
};

/**
 * Tells the backend the customer's payment attempt is done — they closed
 * the Razorpay Checkout.js modal before attempting anything (see
 * openRazorpayCheckout's RazorpayCheckoutError with reason 'cancelled').
 * Without this, that draft order would just sit at 'attempted' on the
 * backend until either a retry replaces it or the backend's own stale-
 * attempt sweep eventually times it out (see payment.service.js's
 * reconcileStalePaymentAttempts) — calling this makes the customer's own
 * "I backed out" signal count immediately instead.
 *
 * Best-effort: the caller (CheckoutContext) doesn't block the UI on this or
 * surface its failure — an order this misses just falls back to the same
 * backend-side timeout sweep it would've hit anyway, so there's nothing
 * worth retrying here. Doesn't need withTransientRetry for the same reason.
 *
 * @param {string} orderId
 * @returns {Promise<{ cancelled: boolean, order: object }>}
 */
export const cancelPaymentAttempt = async (orderId) => {
  const { data } = await apiClient.post('/api/payment/cancel', { orderId });
  return data.data;
};

// --- Razorpay Checkout.js loader -----------------------------------------
// Loaded on demand (only once someone actually reaches the payment step)
// rather than unconditionally in index.html, so pages that never touch
// checkout don't pay for it.
let razorpayScriptPromise = null;

const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScriptPromise = null; // allow a retry on the next attempt
      reject(new Error('Could not load the payment gateway. Please check your connection.'));
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
};

/**
 * Tagged error thrown by openRazorpayCheckout so callers (CheckoutContext)
 * can branch on *why* the modal didn't produce a successful payment
 * without resorting to matching on message text (fragile — e.g. Razorpay
 * supplies its own free-text `error.description`, which would otherwise
 * collide with a hardcoded string check).
 *
 * `reason` is always one of:
 *  - 'cancelled'      the customer closed the modal themselves; nothing was
 *                      attempted, there's nothing to reconcile.
 *  - 'gateway_failed'  Razorpay itself reported the attempt failed (card
 *                      declined, UPI rejected, etc.) — definite, no
 *                      ambiguity, nothing to reconcile either.
 * A network/script error (script failed to load, unexpected throw) is
 * *not* wrapped in this class — those are the genuinely ambiguous cases
 * the caller still needs to reconcile against the order's real state.
 */
export class RazorpayCheckoutError extends Error {
  constructor(message, reason, details) {
    super(message);
    this.name = 'RazorpayCheckoutError';
    this.reason = reason; // 'cancelled' | 'gateway_failed'
    this.details = details; // raw Razorpay payload, useful for support/logs
  }
}

/**
 * Opens the Razorpay Checkout.js modal for a previously-created Razorpay
 * order. Resolves with the checkout response on success, rejects with a
 * RazorpayCheckoutError if the user cancels or Razorpay reports a failed
 * attempt, or a plain Error if the script itself couldn't be loaded.
 *
 * @param {{ razorpayOrder: object, keyId: string, name: string, description?: string, prefillContact?: string }} args
 * @returns {Promise<{ razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }>}
 */
export const openRazorpayCheckout = async ({
  razorpayOrder,
  keyId,
  name,
  description,
  prefillContact,
}) => {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    // Checkout.js can fire both 'payment.failed' and the modal's
    // ondismiss for the same attempt (it closes the modal after a
    // failure) — settle on whichever arrives first and ignore the rest,
    // so a genuine gateway failure is never masked as a plain cancel.
    let settled = false;

    const rzp = new window.Razorpay({
      key: keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.id,
      name,
      description,
      prefill: prefillContact ? { contact: prefillContact } : undefined,
      theme: { color: '#111111' },
      handler: (response) => {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reject(new RazorpayCheckoutError('Payment cancelled.', 'cancelled'));
        },
      },
    });
    rzp.on('payment.failed', (response) => {
      if (settled) return;
      settled = true;
      reject(
        new RazorpayCheckoutError(
          response?.error?.description || 'Payment failed. Please try again.',
          'gateway_failed',
          response?.error
        )
      );
    });
    rzp.open();
  });
};
