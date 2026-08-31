// src/components/Shipping/OrderTrackingTimeline.jsx
//
// Visual step-by-step tracker for a single order, shown on the order
// detail page (OrderSuccessPage, via ShipmentStatusCard) as PHASE 12's
// "order tracking" UI. Deliberately a *presentational* read of two fields
// the backend already exposes — Order.status (prisma/schema.prisma's
// OrderStatus enum, via GET /api/order/:id) and Shipment.status
// (ShipmentStatus enum, via GET /api/shipping/:orderId/track) — no new
// backend endpoint or field was needed for this, and no courier tracking
// detail is ever invented here: every step below is derived strictly from
// those two enums.
//
// Backend statuses are combined into one customer-facing progression
// (Order Placed -> Payment Confirmed -> Processing -> Packed -> Shipped ->
// Out for Delivery -> Delivered) rather than shown as two separate raw
// enums, since a customer doesn't think of "my order" and "my shipment" as
// different things. `shipment` is optional/null — a confirmed order
// doesn't get a Shipment row until an admin triggers shipment creation
// (see shipping.service.js), so the first three steps (Placed / Payment
// Confirmed / Processing) are perfectly renderable from `orderStatus`
// alone before one exists — that's what lets ShipmentStatusCard show a
// real, non-fake status the moment an order is confirmed, rather than
// waiting on a Shipment record.
//
// Why "Processing" and "Packed" are their own steps (rather than being
// folded into "Confirmed"/"Shipped" like the previous 5-step version of
// this component): order.status jumps straight from 'confirmed' to
// 'shipped' the instant a Shipment row is created (see
// shipping.service.js's createShipmentForOrder), before Delhivery has actually
// picked the parcel up — so order.status alone can't tell "still being
// packed" apart from "on the road". Shipment.status can: CREATED means a
// shipment has been manifested with Delhivery but not yet collected (Packed),
// while PICKED_UP/IN_TRANSIT mean it's actually moving (Shipped). Nothing
// here is inferred beyond what those two enums already say.
//
// Same pattern as components/Orders/OrderStatusTimeline.jsx (the compact
// version shown per-row on the "My Orders" list): terminal exception
// states (cancelled/returned) break the normal forward progression, so
// they're rendered as their own distinct end-state row rather than forced
// into the step line. A delivery attempt that failed is different — Delhivery
// can still re-attempt it, so it's surfaced as a non-terminal warning
// alongside the timeline rather than replacing it. A failed *payment*
// (order never reached 'confirmed') is handled by OrderSuccessPage itself
// with its own dedicated banner and "retry payment" action before this
// component is ever mounted — see canShowShipment there.
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FiCheck,
  FiClipboard,
  FiCheckCircle,
  FiClock,
  FiBox,
  FiTruck,
  FiMapPin,
  FiHome,
  FiXCircle,
  FiCornerUpLeft,
  FiAlertTriangle,
} from 'react-icons/fi';

const STEPS = [
  { key: 'placed', labelKey: 'tracking.step.placed', fallback: 'Order Placed', icon: FiClipboard },
  { key: 'paymentConfirmed', labelKey: 'tracking.step.paymentConfirmed', fallback: 'Payment Confirmed', icon: FiCheckCircle },
  { key: 'processing', labelKey: 'tracking.step.processing', fallback: 'Processing', icon: FiClock },
  { key: 'packed', labelKey: 'tracking.step.packed', fallback: 'Packed', icon: FiBox },
  { key: 'shipped', labelKey: 'tracking.step.shipped', fallback: 'Shipped', icon: FiTruck },
  { key: 'outForDelivery', labelKey: 'tracking.step.outForDelivery', fallback: 'Out for Delivery', icon: FiMapPin },
  { key: 'delivered', labelKey: 'tracking.step.delivered', fallback: 'Delivered', icon: FiHome },
];

/**
 * Resolves which step of the 7-step timeline an order/shipment pair has
 * reached. Shipment.status (when present) is authoritative for everything
 * from "Packed" onward since it reflects what Delhivery has actually reported;
 * `orderStatus` alone carries the first three steps, and is also the
 * fallback for "Shipped" if a Shipment record exists on the order
 * (status flips to 'shipped' the moment one is) but its own status
 * couldn't be fetched for some reason.
 *
 * @param {string} orderStatus
 * @param {string|null} shipmentStatus
 * @returns {number} index into STEPS
 */
function resolveCurrentStep(orderStatus, shipmentStatus) {
  if (shipmentStatus === 'DELIVERED' || orderStatus === 'delivered') return 6;
  if (shipmentStatus === 'OUT_FOR_DELIVERY') return 5;
  if (shipmentStatus === 'PICKED_UP' || shipmentStatus === 'IN_TRANSIT') return 4;
  if (shipmentStatus === 'CREATED') return 3;
  // orderStatus flips to 'shipped' as soon as a Shipment row exists (see
  // createShipmentForOrder) — if we get here with no (or an unrecognized)
  // shipmentStatus but the order itself already says 'shipped', that's
  // still the most specific true thing we know, so surface it as such
  // rather than falling back to an earlier step.
  if (orderStatus === 'shipped') return 4;
  // Order confirmed (payment done) but no Shipment row yet — being
  // prepared for dispatch.
  if (orderStatus === 'confirmed') return 2;
  // 'pending' and anything unrecognized falls back to the first step
  // rather than rendering nothing — an order this component is ever
  // mounted for has, at minimum, been placed.
  return 0;
}

export default function OrderTrackingTimeline({ orderStatus, shipmentStatus }) {
  const { t } = useTranslation();

  const isCancelled = orderStatus === 'cancelled' || shipmentStatus === 'CANCELLED';
  const isReturned =
    orderStatus === 'returned' || shipmentStatus === 'RTO_INITIATED' || shipmentStatus === 'RTO_DELIVERED';

  if (isCancelled || isReturned) {
    const Icon = isCancelled ? FiXCircle : FiCornerUpLeft;
    const label = isCancelled
      ? t('tracking.cancelledNote', 'This order was cancelled.')
      : t('tracking.returnedNote', 'This item was returned to the seller.');
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 py-1">
        <Icon className={`w-5 h-5 shrink-0 ${isCancelled ? 'text-red-500' : 'text-gray-500'}`} aria-hidden />
        <span>{label}</span>
      </div>
    );
  }

  const currentIndex = resolveCurrentStep(orderStatus, shipmentStatus);
  // A delivery attempt that didn't go through isn't a terminal state here —
  // Delhivery can re-attempt it — so it's a warning alongside the timeline
  // (still shown at the "Out for Delivery" step, where the attempt was
  // made) rather than a replacement end-state like cancelled/returned above.
  const deliveryAttemptFailed = shipmentStatus === 'DELIVERY_FAILED';

  return (
    <div className="flex flex-col gap-3">
      {deliveryAttemptFailed && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <FiAlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          <span>{t('tracking.deliveryAttemptFailed', "A delivery attempt didn't succeed. Another attempt will be made.")}</span>
        </div>
      )}
      <div
        className="flex items-center w-full py-1 overflow-x-auto"
        role="list"
        aria-label={t('tracking.timelineLabel', 'Order tracking')}
      >
        {STEPS.map((step, index) => {
          const isComplete = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1.5 min-w-[46px]" role="listitem" aria-current={isCurrent ? 'step' : undefined}>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${
                    isComplete
                      ? 'bg-[var(--clr-primary)] border-[var(--clr-primary)] text-white'
                      : 'bg-white border-gray-200 text-gray-300'
                  }`}
                >
                  {isComplete && !isCurrent ? (
                    <FiCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden />
                  ) : (
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden />
                  )}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] text-center leading-tight ${
                    isComplete ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}
                >
                  {t(step.labelKey, step.fallback)}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mb-5 min-w-[10px] ${index < currentIndex ? 'bg-[var(--clr-primary)]' : 'bg-gray-200'}`}
                  aria-hidden
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

OrderTrackingTimeline.propTypes = {
  orderStatus: PropTypes.string,
  shipmentStatus: PropTypes.string,
};
