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
export default function WhatsAppStrip({ short = false, className = '', titleKey, titleDefault, subtitleKey, subtitleDefault, title: titleOverride, subtitle: subtitleOverride, cta: ctaOverride }) {
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
      className={`flex items-center gap-[13px] rounded bg-advika-whatsapp px-4 py-5 text-white ${className}`}
    >
      <Icon name="chat" size={30} />
      <span className="flex-1">
        <span className="block text-[14px] font-bold leading-[1.35]">{title}</span>
        <span className="block text-[12px] leading-[1.45] text-advika-whatsapp-tint">
          {subtitle}
        </span>
      </span>
      <span className="shrink-0 rounded-[3px] bg-white px-[14px] py-[13px] text-[12px] font-bold text-advika-whatsapp">
        {ctaOverride || t('advika.whatsapp.cta', 'CHAT')}
      </span>
    </a>
  );
}
