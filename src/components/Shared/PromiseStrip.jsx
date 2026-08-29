// src/components/Shared/PromiseStrip.jsx
//
// Three-up "Cash on Delivery / Fast Shipping / GST Bill" strip — appears
// on cart, category, product and wishlist. See
// design_handoff_advika_auto/README.md "Shared Patterns".
import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';

export default function PromiseStrip({ compact = false, className = '', items: itemsOverride }) {
  const { t } = useTranslation();
  const items = itemsOverride || [
    { icon: 'payments', title: t('advika.promise.cod', 'Cash on Delivery'), body: t('advika.promise.codBody', 'Pay when it reaches you') },
    { icon: 'local_shipping', title: t('advika.promise.shipping', 'Fast Shipping'), body: t('advika.promise.shippingBody', 'Delivered in 3-4 days') },
    { icon: 'receipt_long', title: t('advika.promise.gst', 'GST Bill'), body: t('advika.promise.gstBody', 'Original brands, proper invoice') },
  ];

  return (
    <div className={`grid grid-cols-3 gap-[10px] ${className}`}>
      {items.map((item) => (
        <div
          key={item.icon}
          className="flex flex-col items-center gap-[6px] rounded border border-advika-border-light bg-white px-2 py-[13px] text-center"
        >
          <Icon name={item.icon} size={compact ? 21 : 22} className="text-advika-orange" />
          <span className={`font-bold text-advika-chrome ${compact ? 'text-[10.5px] leading-[1.35]' : 'text-[11.5px] leading-[1.3]'}`}>{item.title}</span>
          {!compact && <span className="text-[9.5px] leading-[1.35] text-advika-grey700">{item.body}</span>}
        </div>
      ))}
    </div>
  );
}
