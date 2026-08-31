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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiRefreshCw, FiMapPin } from 'react-icons/fi';

// Conflict types that "Refresh order" alone might not fix — an address
// that's gone, or a pincode that turned out to be invalid/undeliverable
// (see order.service.js's detectAddressConflict), generally needs the
// customer to pick a different address instead. Both actions are offered
// whenever any conflict needs the address-fixing path, since a single
// response can also contain a plain price/stock conflict at the same time.
// `delivery_check_unavailable` is the one exception in spirit — it means
// the carrier check itself couldn't get an answer (a transient outage, not
// a real problem with the address — see shipping.service.js's
// CHECK_UNAVAILABLE reason) — but it's grouped here anyway so the customer
// always has "try a different address" as a fallback if the outage
// persists, alongside "Refresh order" (the fix that's actually likely to
// resolve it once the carrier recovers).
const ADDRESS_CONFLICT_TYPES = new Set([
  'address_unavailable',
  'invalid_pincode',
  'delivery_unavailable',
  'delivery_check_unavailable',
  'cod_unavailable',
]);

export default function OrderConflictsNotice({ conflicts, onRefresh, isRefreshing }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!conflicts || conflicts.length === 0) return null;

  const hasAddressConflict = conflicts.some((c) => ADDRESS_CONFLICT_TYPES.has(c.type));

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
      <div className="flex flex-wrap gap-2">
        {hasAddressConflict && (
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="btn btn-primary self-start px-4 py-2 text-sm flex items-center gap-2"
          >
            <FiMapPin className="w-4 h-4" aria-hidden />
            {t('checkout.chooseDifferentAddress', 'Choose a different address')}
          </button>
        )}
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
      </div>
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
        // Delivery-layer conflicts (see order.service.js's
        // detectAddressConflict, which now also checks the address's
        // pincode via shipping.service.js's checkDeliveryEligibility):
        'invalid_pincode',              // pincode isn't a real one Delhivery recognizes
        'delivery_unavailable',         // real pincode, but Delhivery doesn't cover it
        'delivery_check_unavailable',   // carrier check itself couldn't get an answer (fail-closed policy)
        'cod_unavailable',              // covered, but not for Cash on Delivery
      ]),
      message: PropTypes.string,
    })
  ),
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool,
};
