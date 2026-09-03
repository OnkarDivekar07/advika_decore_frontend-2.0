// src/components/Orders/PaymentInfoCard.jsx
//
// Full "Payment Information" block for the order detail page
// (OrderSuccessPage) — method, status, amount, and (for a paid online
// order) the Razorpay payment reference, plus when the order was placed.
// Deliberately takes the already-derived paymentMethod/isFailed/
// isProcessing as props rather than re-deriving them from
// order.paymentStatus itself — OrderSuccessPage already computes exactly
// this (used for its own headline/icon) from the same order object this
// card is passed, and duplicating that logic here would risk the two
// disagreeing if either one's rules ever change.
//
// order.payment_id (the Razorpay pay_xxx that actually captured the
// payment — see prisma/schema.prisma's Order.payment_id / webhook write in
// payment.service.js) is already returned as-is by GET /api/order/:id
// (order.service.js's fetchOrderById uses a plain `include`, not a
// trimmed `select`), so no backend change was needed to show it here.
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard } from 'react-icons/fi';
import { formatPrice } from '@/utils/productUtils';

function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PaymentInfoCard({ order, paymentMethod, isFailed, isProcessing }) {
  const { t } = useTranslation();

  if (!order) return null;

  const placedOn = formatDateTime(order.createdAt);
  const statusLabel =
    paymentMethod === 'cod'
      ? t('orderSuccess.paymentCod', 'Cash on Delivery')
      : isFailed
        ? t('orderSuccess.paymentFailed', 'Failed')
        : isProcessing
          ? t('orderSuccess.paymentProcessing', 'Processing')
          : t('orderSuccess.paymentPaid', 'Paid');
  const statusClassName = isFailed
    ? 'bg-red-50 text-red-700 border-red-200'
    : isProcessing
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : paymentMethod === 'cod'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-green-50 text-green-700 border-green-200';

  // Only meaningful once money has actually been captured online — a COD
  // order never has one, and a failed/still-processing online attempt
  // hasn't been captured yet either (see payment.service.js — payment_id
  // is only ever set from the webhook's captured-payment event).
  const showPaymentId = paymentMethod !== 'cod' && !isFailed && !isProcessing && order.payment_id;

  return (
    <section className="card p-5 flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
        <FiCreditCard className="w-4 h-4 text-[var(--clr-primary)]" aria-hidden />
        {t('orderSuccess.paymentInfo', 'Payment Information')}
      </h2>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{t('orderSuccess.paymentMethod', 'Payment Method')}</span>
        <span className="font-medium text-gray-900">
          {paymentMethod === 'cod'
            ? t('orderSuccess.methodCod', 'Cash on Delivery')
            : t('orderSuccess.methodOnline', 'Online Payment')}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{t('orderSuccess.paymentInfoStatus', 'Payment Status')}</span>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClassName}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{t('orderSuccess.amount', 'Amount')}</span>
        <span className="font-semibold text-gray-900">₹{formatPrice(order.total ?? 0)}</span>
      </div>

      {showPaymentId && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{t('orderSuccess.paymentId', 'Payment Reference')}</span>
          <span className="font-mono text-xs text-gray-900 truncate max-w-[60%]" title={order.payment_id}>
            {order.payment_id}
          </span>
        </div>
      )}

      {placedOn && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{t('orderSuccess.orderedOn', 'Ordered On')}</span>
          <span className="text-gray-900">{placedOn}</span>
        </div>
      )}
    </section>
  );
}

PaymentInfoCard.propTypes = {
  order: PropTypes.shape({
    total: PropTypes.number,
    payment_id: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  }),
  paymentMethod: PropTypes.oneOf(['cod', 'online']).isRequired,
  isFailed: PropTypes.bool,
  isProcessing: PropTypes.bool,
};
