// src/services/paymentService.js
//
// Payment endpoints (see payment.routes.js). This layer's only job is
// getting money/COD requests to the backend and handing back what it
// says — the backend (and, for online payment, the Razorpay webhook) is
// the source of truth for whether an order actually got paid, never a
// computation done here. See checkout-architecture.md §1-3.
import apiClient from '@/utils/apiClient';

/**
 * Creates (or reuses, or reconciles) a Razorpay order sized to the user's
 * current draft order total. Safe to call again for the same draft order —
 * the backend reuses an existing not-yet-paid Razorpay order instead of
 * minting a new one (see payment.controller.js's createOrderid), so a retry
 * after a dropped connection or a double-tap never orphans a payment.
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
  const { data } = await apiClient.post('/api/payment/create-orderid');
  return data.data;
};

/**
 * Forwards Razorpay Checkout.js's callback payload for HMAC verification.
 * Best-effort UI feedback only — the webhook is the real backstop if the
 * client never gets to call this (tab closed, network died mid-payment).
 * @param {{ razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }} payload
 * @returns {Promise<{ success: boolean, alreadyProcessed: boolean, orderId: string }>}
 */
export const verifyPayment = async (payload) => {
  const { data } = await apiClient.post('/api/payment/verify', payload);
  return data.data;
};

/**
 * @param {string} orderId
 * @returns {Promise<{ success: boolean, order: object, alreadyProcessed: boolean }>}
 */
export const placeCODOrder = async (orderId) => {
  const { data } = await apiClient.post('/api/payment/cod', { orderId, method: 'cod' });
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
 * Opens the Razorpay Checkout.js modal for a previously-created Razorpay
 * order. Resolves with the checkout response on success, rejects if the
 * script fails to load or the user dismisses the modal.
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
    const rzp = new window.Razorpay({
      key: keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.id,
      name,
      description,
      prefill: prefillContact ? { contact: prefillContact } : undefined,
      theme: { color: '#111111' },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled.')),
      },
    });
    rzp.on('payment.failed', (response) => {
      reject(new Error(response?.error?.description || 'Payment failed.'));
    });
    rzp.open();
  });
};
