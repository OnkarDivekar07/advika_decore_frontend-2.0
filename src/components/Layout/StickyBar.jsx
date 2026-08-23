// src/components/Layout/StickyBar.jsx
//
// Sticky bottom bars — see design_handoff_advika_auto/README.md, Landing
// section 12 (CALL / WHATSAPP / VIEW CART) and the Product/Cart per-page
// variants (a summary line beside one primary action).
import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { useCart } from '@/contexts/CartContext';
import { BRAND_PHONE_TEL, BRAND_WHATSAPP_URL } from '@/config/advikaAuto';

export function LandingStickyBar() {
  const { t } = useTranslation();
  const { itemCount } = useCart();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto grid max-w-shell grid-cols-[1fr_1fr_1.4fr] border-t border-[#333] bg-advika-chrome">
      <a href={BRAND_PHONE_TEL} className="flex h-[66px] flex-col items-center justify-center gap-1 border-r border-[#333]">
        <Icon name="call" size={22} className="text-advika-orange" />
        <span className="aa-mono text-[9.5px] text-[#e5e5e5]">{t('advika.landing.callLabel', 'CALL')}</span>
      </a>
      <a
        href={`${BRAND_WHATSAPP_URL}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-[66px] flex-col items-center justify-center gap-1 border-r border-[#333]"
      >
        <Icon name="chat" size={22} className="text-advika-whatsapp-bright" />
        <span className="aa-mono text-[9.5px] text-[#e5e5e5]">{t('advika.landing.whatsappLabel', 'WHATSAPP')}</span>
      </a>
      <a href="/cart" className="flex h-[66px] flex-col items-center justify-center gap-1 bg-advika-orange">
        <Icon name="shopping_cart" size={20} className="text-white" />
        <span className="aa-label text-[13.5px] font-bold text-white">
          {t('advika.landing.viewCart', 'VIEW CART')}
          {itemCount > 0 ? ` (${itemCount})` : ''}
        </span>
      </a>
    </div>
  );
}

// Generic "label / mono price" + one primary CTA bar, used by Product
// Detail and Cart. `children` renders the button itself so each caller
// keeps full control of its own state/label.
export function StickyActionBar({ eyebrow, value, children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-w-shell items-center gap-3 border-t border-[#333] bg-advika-chrome px-[14px] py-[11px]">
      {(eyebrow || value) && (
        <div className="flex flex-col">
          {eyebrow && <span className="aa-label text-[9px] text-advika-grey600">{eyebrow}</span>}
          {value && <span className="aa-mono text-[19px] font-semibold text-white">{value}</span>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
