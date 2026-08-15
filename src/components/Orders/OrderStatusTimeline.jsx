// src/components/Orders/OrderStatusTimeline.jsx
//
// Compact horizontal status timeline shown per order in the My Orders
// section (OrderCard) — a step-by-step view of where the order stands
// (Placed -> Confirmed -> Shipped -> Delivered) built entirely from the
// order's own `status` field, which GET /api/order/history already
// selects (see order.service.js#getUserOrderHistory / prisma/schema.prisma's
// OrderStatus enum). No new backend data is needed — this is a
// presentational read of the same status OrderCard's badge already shows,
// just laid out as a progression instead of a single badge, so the
// customer can see where an order stands without leaving the list.
//
// `status` moves forward on its own server-side as the order is
// confirmed/shipped/delivered (see shipping.service.js's
// syncOrderStatusFromShipment) — this component never infers or advances
// state itself, only renders whatever status it's given.
//
// 'cancelled' and 'returned' break the normal forward progression, so
// they're rendered as their own distinct end-state row rather than forced
// into the 4-step line (a cancelled order didn't necessarily reach
// "shipped" before being cancelled, so highlighting steps up to a fixed
// index would misrepresent what actually happened).
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FiCheck,
  FiClipboard,
  FiPackage,
  FiTruck,
  FiHome,
  FiXCircle,
  FiCornerUpLeft,
} from 'react-icons/fi';

// Mirrors the forward-progress subset of prisma/schema.prisma's OrderStatus
// enum ('draft' never reaches here — GET /api/order/history excludes it;
// 'cancelled'/'returned' are handled separately below).
const STEPS = [
  { key: 'pending', labelKey: 'orders.statusStep.placed', fallback: 'Placed', icon: FiClipboard },
  { key: 'confirmed', labelKey: 'orders.statusStep.confirmed', fallback: 'Confirmed', icon: FiPackage },
  { key: 'shipped', labelKey: 'orders.statusStep.shipped', fallback: 'Shipped', icon: FiTruck },
  { key: 'delivered', labelKey: 'orders.statusStep.delivered', fallback: 'Delivered', icon: FiHome },
];

export default function OrderStatusTimeline({ status }) {
  const { t } = useTranslation();

  if (status === 'cancelled' || status === 'returned') {
    const Icon = status === 'cancelled' ? FiXCircle : FiCornerUpLeft;
    const label =
      status === 'cancelled'
        ? t('orders.statusStep.cancelledNote', 'This order was cancelled.')
        : t('orders.statusStep.returnedNote', 'This order was returned.');
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 py-1">
        <Icon
          className={`w-4 h-4 shrink-0 ${status === 'cancelled' ? 'text-red-500' : 'text-gray-500'}`}
          aria-hidden
        />
        <span>{label}</span>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.key === status);
  // Unrecognized/future status (or 'draft', which shouldn't reach this
  // component at all) — skip rendering a timeline that would misrepresent
  // progress rather than guessing a position for it.
  if (currentIndex === -1) return null;

  return (
    <div
      className="flex items-center w-full py-1"
      role="list"
      aria-label={t('orders.statusStep.timelineLabel', 'Order status')}
    >
      {STEPS.map((step, index) => {
        const isComplete = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 min-w-[56px]" role="listitem" aria-current={isCurrent ? 'step' : undefined}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${
                  isComplete
                    ? 'bg-[var(--clr-primary)] border-[var(--clr-primary)] text-white'
                    : 'bg-white border-gray-200 text-gray-300'
                }`}
              >
                {isComplete && !isCurrent ? (
                  <FiCheck className="w-3.5 h-3.5" aria-hidden />
                ) : (
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                )}
              </div>
              <span
                className={`text-[10px] text-center leading-tight ${
                  isComplete ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}
              >
                {t(step.labelKey, step.fallback)}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 ${
                  index < currentIndex ? 'bg-[var(--clr-primary)]' : 'bg-gray-200'
                }`}
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

OrderStatusTimeline.propTypes = {
  status: PropTypes.string,
};
