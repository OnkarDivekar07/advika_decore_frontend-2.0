// src/components/Checkout/OrderSummaryCard.jsx
//
// The one place order line items and totals get rendered from — used by
// PaymentPage (against the draft order) and OrderSuccessPage (against the
// confirmed order fetched via orderService.getOrderById). Deliberately a
// pure presentational component: every number it shows comes straight off
// the `order` prop, which is always a backend response (draft or
// confirmed), never something computed here. See
// checkout-architecture.md §2 — "anything that touches money is
// backend-derived and re-fetched, never re-derived on the frontend".
//
// Each line item's price is `item.price` — the OrderItem snapshot taken
// at draft-order time (see order.service.js's createDraftOrderService) —
// not `item.product?.price`, which can have moved on since. That's what
// makes this the same total whether it's rendered from a draft order
// (product embedded) or a confirmed order (product selected down to just
// `name` — see order.service.js's fetchOrderById): the price never came
// from `product` either way.
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

export default function OrderSummaryCard({ order, title }) {
  const { t } = useTranslation();

  if (!order) return null;

  const items = order.orderItems ?? [];
  const subtotal = order.subtotal ?? 0;
  const deliveryCharge = order.deliveryCharge ?? 0;
  const discount = order.discount ?? 0;
  const total = order.total ?? 0;

  return (
    <section className="card p-5 flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-gray-900">
        {title ?? t('checkout.orderSummary', 'Order Summary')}
      </h2>

      {items.map((item) => (
        <div key={item.id} className="flex justify-between text-sm text-gray-600">
          <span>
            {item.product?.name ?? t('checkout.itemFallback', 'Item')} × {item.quantity}
          </span>
          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
        </div>
      ))}

      <hr className="border-[var(--clr-border)]" />

      <div className="flex justify-between text-sm text-gray-600">
        <span>{t('cart.cartSubtotal', 'Cart Subtotal')}</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>{t('cart.deliveryCharge', 'Delivery Charge')}</span>
        {deliveryCharge > 0 ? (
          <span>₹{deliveryCharge.toFixed(2)}</span>
        ) : (
          <span className="text-green-600 font-medium">{t('cart.free', 'Free')}</span>
        )}
      </div>

      {discount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>
            {t('cart.discount', 'Discount')}
            {order.couponCode ? ` (${order.couponCode})` : ''}
          </span>
          <span>-₹{discount.toFixed(2)}</span>
        </div>
      )}

      <hr className="border-[var(--clr-border)]" />

      <div className="flex justify-between text-base font-bold text-gray-900">
        <span>{t('checkout.total', 'Total')}</span>
        <span className="text-primary text-xl">₹{total.toFixed(2)}</span>
      </div>
    </section>
  );
}

OrderSummaryCard.propTypes = {
  // Either a draft order (POST/GET /api/order) or a confirmed order
  // (GET /api/order/:id) — same shape for the fields this reads.
  order: PropTypes.shape({
    orderItems: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        quantity: PropTypes.number,
        price: PropTypes.number,
        product: PropTypes.shape({ name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]) }),
      })
    ),
    subtotal: PropTypes.number,
    deliveryCharge: PropTypes.number,
    discount: PropTypes.number,
    couponCode: PropTypes.string,
    total: PropTypes.number,
  }),
  title: PropTypes.string,
};
