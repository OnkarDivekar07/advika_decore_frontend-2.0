// src/components/Shared/WhatsAppStrip.jsx
//
// See design_handoff_advika_auto/README.md "Shared Patterns" — real
// wa.me deep link (the design handoff notes the prototype used a bare
// tel: link and calls this out as something to fix in production).
import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { useBrandPhone } from '@/hooks/useBrandPhone';

// `title`/`subtitle`/`cta` are already-resolved strings (e.g. from
// useSiteContent's getText) and take precedence over everything else —
// lets one call site (HomePage's admin-editable instance) override the
// text without touching any other caller that only ever passes
// titleKey/short and expects the static i18n defaults below.
// `compact` selects the Category-listing variant (design: 16px uniform
// padding, 12px gap, 26px icon, 13px/11.5px copy, tighter CTA padding) —
// vs the Landing variant's looser 20px/16px padding, 13px gap, 30px icon,
// 14px/12px copy and roomier CTA padding.
export default function WhatsAppStrip({ short = false, compact = false, className = '', titleKey, titleDefault, subtitleKey, subtitleDefault, title: titleOverride, subtitle: subtitleOverride, cta: ctaOverride }) {
  const { t } = useTranslation();
  const { whatsapp } = useBrandPhone();
  const title = titleOverride || (titleKey
    ? t(titleKey, titleDefault)
    : short
      ? t('advika.whatsapp.titleShort', "Can't find the part?")
      : t('advika.whatsapp.title', 'Not sure what fits your truck?'));
  const subtitle = subtitleOverride || (subtitleKey
    ? t(subtitleKey, subtitleDefault)
    : t('advika.whatsapp.subtitle', 'Send your vehicle model on WhatsApp — reply in 10 minutes'));

  return (
    <a
      href={`${whatsapp}?text=${encodeURIComponent(title)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center rounded bg-advika-whatsapp text-white ${compact ? 'gap-3 p-4' : 'gap-[13px] px-4 py-5'} ${className}`}
    >
      <Icon name="chat" size={compact ? 26 : 30} />
      <span className="flex-1">
        <span className={`block font-bold leading-[1.35] ${compact ? 'text-[13px]' : 'text-[14px]'}`}>{title}</span>
        <span className={`block text-advika-whatsapp-tint ${compact ? 'text-[11.5px] leading-[1.4]' : 'text-[12px] leading-[1.45]'}`}>
          {subtitle}
        </span>
      </span>
      <span className={`shrink-0 rounded-[3px] bg-white font-bold text-advika-whatsapp ${compact ? 'px-[12px] py-[11px] text-[11.5px]' : 'px-[14px] py-[13px] text-[12px]'}`}>
        {ctaOverride || t('advika.whatsapp.cta', 'CHAT')}
      </span>
    </a>
  );
}
