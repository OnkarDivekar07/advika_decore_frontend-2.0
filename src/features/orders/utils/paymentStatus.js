// src/features/orders/utils/paymentStatus.js
//
// Single place that turns an order's raw `paymentStatus` (+ `payment_order_id`)
// — see prisma/schema.prisma's PaymentStatus enum and payment.service.js's
// state machine — into what a customer should see. Mirrors the exact
// grouping OrderSuccessPage already uses for its own headline/badge
// (UNRESOLVED_PAYMENT_STATUSES / FAILED_LIKE_PAYMENT_STATUSES), so "My
// Orders" (OrderCard) and the order-detail page never disagree about what
// counts as paid/processing/failed for the same paymentStatus value.
//
// Deliberately reads nothing but what GET /api/order/history and
// GET /api/order/:id already select (order.service.js) — no new backend
// data needed.

// 'pending'/'attempted'/'processing': payment.service.js's createOrderid
// moves a fresh draft to 'attempted' as soon as a Razorpay order is
// minted, and the webhook can sit at 'processing' briefly during
// reconciliation — none of these mean the money has actually moved yet.
const UNRESOLVED_PAYMENT_STATUSES = ['pending', 'attempted', 'processing'];

// Terminal states where an online payment did NOT succeed.
const FAILED_LIKE_PAYMENT_STATUSES = ['failed', 'cancelled', 'timeout', 'unknown'];

/**
 * @param {{ paymentStatus?: string, payment_order_id?: string }} order
 * @returns {'cod' | 'online'} best-effort payment method, same
 *   payment_order_id-prefix convention OrderSuccessPage uses.
 */
export function derivePaymentMethod(order) {
  return order?.payment_order_id?.startsWith('cod-') ? 'cod' : 'online';
}

/**
 * @param {{ paymentStatus?: string, payment_order_id?: string }} order
 * @returns {{
 *   group: 'paid' | 'codPending' | 'processing' | 'failed' | 'refunded' | 'unknown',
 *   labelKey: string,
 *   fallback: string,
 *   className: string,
 * }}
 */
export function getPaymentStatusMeta(order) {
  const paymentStatus = order?.paymentStatus;
  const paymentMethod = derivePaymentMethod(order);

  if (paymentStatus === 'refunded') {
    return {
      group: 'refunded',
      labelKey: 'orders.paymentStatus.refunded',
      fallback: 'Refunded',
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    };
  }

  // COD orders sit at 'cod_pending' until delivery — that's expected, not
  // a failure or an in-progress online payment (see payment.service.js's
  // handleCODOrder), so it gets its own neutral "Pay on Delivery" label
  // rather than being lumped in with either.
  if (paymentMethod === 'cod' && paymentStatus === 'cod_pending') {
    return {
      group: 'codPending',
      labelKey: 'orders.paymentStatus.codPending',
      fallback: 'Pay on Delivery',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  if (paymentStatus === 'paid') {
    return {
      group: 'paid',
      labelKey: 'orders.paymentStatus.paid',
      fallback: 'Paid',
      className: 'bg-green-50 text-green-700 border-green-200',
    };
  }

  if (FAILED_LIKE_PAYMENT_STATUSES.includes(paymentStatus)) {
    return {
      group: 'failed',
      labelKey: 'orders.paymentStatus.failed',
      fallback: 'Payment Failed',
      className: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  if (UNRESOLVED_PAYMENT_STATUSES.includes(paymentStatus)) {
    return {
      group: 'processing',
      labelKey: 'orders.paymentStatus.processing',
      fallback: 'Payment Processing',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  // Unrecognized/missing paymentStatus (e.g. an order predating this
  // field) — neutral fallback rather than guessing.
  return {
    group: 'unknown',
    labelKey: 'orders.paymentStatus.unknown',
    fallback: paymentStatus ?? 'Unknown',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  };
}
