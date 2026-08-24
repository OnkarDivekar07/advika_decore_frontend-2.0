// src/components/Orders/OrderCard.jsx
//
// A single order's summary row on the "My Orders" list (OrderListPage) —
// order id, placed-on date, status badge, a thumbnail strip of its items,
// and the total. Deliberately shows only what GET /api/order/history
// already selects per order (see order.service.js#getUserOrderHistory) —
// no address, no payment breakdown — full detail lives one tap away on
// the order's own page (GET /api/order/:id via OrderSuccessPage).
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiChevronRight, FiPackage } from 'react-icons/fi';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import OrderStatusTimeline from '@/components/Orders/OrderStatusTimeline';
import { getPaymentStatusMeta } from '@/features/orders/utils/paymentStatus';

// Order.status (see prisma/schema.prisma's OrderStatus enum) — 'draft' is
// deliberately absent: GET /api/order/history never returns draft orders,
// so a card here is never expected to render one, but the fallback below
// still covers it (and any future status) with a neutral badge rather than
// crashing on an unrecognized key.
const STATUS_META = {
  pending: { key: 'orders.status.pending', fallback: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { key: 'orders.status.confirmed', fallback: 'Confirmed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  shipped: { key: 'orders.status.shipped', fallback: 'Shipped', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  delivered: { key: 'orders.status.delivered', fallback: 'Delivered', className: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { key: 'orders.status.cancelled', fallback: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' },
  returned: { key: 'orders.status.returned', fallback: 'Returned', className: 'bg-gray-100 text-gray-700 border-gray-300' },
};

const MAX_THUMBNAILS = 3;

function formatOrderDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrderCard({ order }) {
  const { t } = useTranslation();

  const items = order.orderItems ?? [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const thumbnails = items.slice(0, MAX_THUMBNAILS);
  const extraCount = Math.max(0, items.length - MAX_THUMBNAILS);
  const statusMeta = STATUS_META[order.status] ?? {
    key: 'orders.status.unknown',
    fallback: order.status ?? 'Unknown',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  const placedOn = formatOrderDate(order.createdAt);
  const paymentStatusMeta = getPaymentStatusMeta(order);

  return (
    <Link
      to={`/orders/${order.id}/track`}
      aria-label={t('orders.viewOrderDetails', 'View details for order {{id}}', { id: order.id })}
      data-testid={`order-card-${order.id}`}
      className="card p-4 sm:p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{t('orders.orderId', 'Order ID')}</p>
          <p className="font-mono text-sm text-gray-900 truncate">{order.id}</p>
          {placedOn && (
            <p className="text-xs text-gray-500 mt-1">
              {t('orders.placedOn', 'Placed on {{date}}', { date: placedOn })}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.className}`}
          >
            {t(statusMeta.key, statusMeta.fallback)}
          </span>
          {/* Payment status is a separate axis from order.status above — a
              'pending' order can be paid (online, awaiting confirmation)
              or unpaid (COD) — see features/orders/utils/paymentStatus.js,
              which mirrors the same paymentStatus grouping OrderSuccessPage
              uses on the order's own detail page. */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${paymentStatusMeta.className}`}
          >
            {t(paymentStatusMeta.labelKey, paymentStatusMeta.fallback)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {thumbnails.length === 0 ? (
          <div className="w-14 h-14 rounded-lg bg-gray-50 border border-[var(--clr-border)] flex items-center justify-center text-gray-300">
            <FiPackage className="w-5 h-5" aria-hidden />
          </div>
        ) : (
          thumbnails.map((item) => (
            <div
              key={item.id}
              className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-[var(--clr-border)] shrink-0"
            >
              <ImageWithFallback
                src={item.product?.images?.[0] || null}
                alt={item.product?.name ?? t('checkout.itemFallback', 'Item')}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))
        )}
        {extraCount > 0 && (
          <div className="w-14 h-14 rounded-lg bg-gray-50 border border-[var(--clr-border)] flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
            +{extraCount}
          </div>
        )}
        <p className="text-xs text-gray-500 ml-1">
          {t('orders.itemCount', '{{count}} item', { count: itemCount, defaultValue_plural: '{{count}} items' })}
        </p>
      </div>

      <OrderStatusTimeline status={order.status} />

      <div className="flex items-center justify-between pt-3 border-t border-[var(--clr-border)]">
        <div>
          <p className="text-xs text-gray-500">{t('checkout.total', 'Total')}</p>
          <p className="text-lg font-bold text-primary">₹{(order.total ?? 0).toFixed(2)}</p>
        </div>
        <span className="flex items-center gap-1 text-sm font-medium text-[var(--clr-primary-dark)]">
          {t('orders.viewDetails', 'View Details')}
          <FiChevronRight className="w-4 h-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

OrderCard.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string,
    paymentStatus: PropTypes.string,
    payment_order_id: PropTypes.string,
    total: PropTypes.number,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    orderItems: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        quantity: PropTypes.number,
        product: PropTypes.shape({
          name: PropTypes.string,
          images: PropTypes.arrayOf(PropTypes.string),
        }),
      })
    ),
  }).isRequired,
};
