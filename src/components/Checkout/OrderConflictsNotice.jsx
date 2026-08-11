// src/components/Checkout/OrderConflictsNotice.jsx
//
// Surfaces the structured `conflicts` array the backend returns (409) when
// a draft order has gone stale between when it was created and when the
// customer actually tries to pay for it — see order.service.js's
// detectOrderConflicts, run just before COD placement and just before a
// Razorpay order is created (payment.service.js / payment.controller.js).
// Each conflict is already a human-readable message from the backend
// (price changed / out of stock / no longer available) — this component
// doesn't reinterpret or re-derive anything, it just lists what came back
// and offers the one safe next step: refresh the draft order (re-running
// the same server-side price/stock validation) before retrying.
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function OrderConflictsNotice({ conflicts, onRefresh, isRefreshing }) {
  const { t } = useTranslation();

  if (!conflicts || conflicts.length === 0) return null;

  return (
    <section className="card p-4 border-amber-300 bg-amber-50 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <FiAlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-amber-800">
            {t('checkout.conflictsTitle', 'Some items in your order have changed')}
          </p>
          <ul className="text-sm text-amber-700 list-disc pl-4 flex flex-col gap-0.5">
            {conflicts.map((conflict, i) => (
              <li key={`${conflict.productId}-${conflict.type}-${i}`}>
                {conflict.name ? `${conflict.name}: ` : ''}
                {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="btn btn-outline self-start px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
        {isRefreshing
          ? t('checkout.refreshingOrder', 'Refreshing…')
          : t('checkout.refreshOrder', 'Refresh order')}
      </button>
    </section>
  );
}

OrderConflictsNotice.propTypes = {
  conflicts: PropTypes.arrayOf(
    PropTypes.shape({
      productId: PropTypes.string,
      name: PropTypes.string,
      type: PropTypes.oneOf([
        'price_changed',
        'insufficient_stock',
        'unavailable',
        'address_unavailable',
      ]),
      message: PropTypes.string,
    })
  ),
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool,
};
