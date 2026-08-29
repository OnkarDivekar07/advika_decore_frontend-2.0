// src/hooks/useBrandPhone.js — the single business phone number, admin
// editable via SiteContent (see useSiteContent.js), used consistently for
// every click-to-call and WhatsApp link across the app (footer, sticky
// bar, product detail, cart, order tracking, vehicle page, slide menu).
// A phone number isn't translated per-language — it's seeded with the
// same value in valueEn/valueHi/valueMr — but it's still read through
// getText(key, lang, fallback) so it swaps in once the admin-edited row
// loads, same fail-safe fallback-to-static behavior as every other piece
// of dynamic storefront text.
import { useTranslation } from 'react-i18next';
import { useSiteContent } from '@/hooks/useSiteContent';
import { BRAND_PHONE_DISPLAY } from '@/config/advikaAuto';

function normalize(display) {
  const digits = display.replace(/[^\d+]/g, '');
  const e164 = digits.startsWith('+') ? digits : `+${digits}`;
  return {
    display,
    tel: `tel:${e164}`,
    whatsapp: `https://wa.me/${e164.slice(1)}`,
  };
}

export function useBrandPhone() {
  const { i18n } = useTranslation();
  const { getText } = useSiteContent();
  const display = getText('brand.phone', i18n.language, BRAND_PHONE_DISPLAY);
  return normalize(display);
}
