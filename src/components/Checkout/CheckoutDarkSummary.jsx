// src/components/Checkout/CheckoutDarkSummary.jsx
//
// The dark order-summary card at the foot of Checkout steps 1-3 — see
// design_handoff_advika_auto/README.md, screen 6. Same data contract as
// OrderSummaryCard (a draft or confirmed order response — everything
// here comes straight off `order`, never recomputed) just restyled;
// kept as its own component rather than editing OrderSummaryCard in
// place since that one's still used verbatim elsewhere.
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function CheckoutDarkSummary({ order }) {
  const { t } = useTranslation();
  if (!order) return null;
  const items = order.orderItems ?? [];
  const subtotal = order.subtotal ?? 0;
  const deliveryCharge = order.deliveryCharge ?? 0;
  const total = order.total ?? 0;

  return (
    <div className="flex flex-col gap-[15px] rounded bg-advika-near-black p-[18px]">
      <h2 className="font-archivoBlack text-[17px] text-white">{t('checkout.orderSummary', 'Order Summary')}</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-[12.5px] text-advika-grey600">
            <span className="truncate pr-2">
              {item.product?.name ?? t('checkout.itemFallback', 'Item')} ×{item.quantity}
            </span>
            <span className="aa-mono shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[13px] text-advika-grey600">
        <span>{t('checkout.subtotal', 'Subtotal')}</span>
        <span className="aa-mono">₹{subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-[13px] text-advika-grey600">
        <span>{t('advika.cartPage.shipping')}</span>
        {deliveryCharge > 0 ? (
          <span className="aa-mono">₹{deliveryCharge.toFixed(2)}</span>
        ) : (
          <span className="aa-mono font-semibold text-advika-success-bright">{t('advika.cartPage.free', 'FREE')}</span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-advika-border-dark pt-[15px]">
        <span className="text-[15px] font-bold text-white">{t('checkout.total', 'Total')}</span>
        <span className="aa-mono text-[19px] font-semibold text-advika-orange">₹{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
