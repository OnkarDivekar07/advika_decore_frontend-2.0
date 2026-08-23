// src/components/Shared/WhatsAppStrip.jsx
//
// See design_handoff_advika_auto/README.md "Shared Patterns" — real
// wa.me deep link (the design handoff notes the prototype used a bare
// tel: link and calls this out as something to fix in production).
import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { BRAND_WHATSAPP_URL } from '@/config/advikaAuto';

export default function WhatsAppStrip({ short = false, className = '', titleKey, titleDefault, subtitleKey, subtitleDefault }) {
  const { t } = useTranslation();
  const title = titleKey
    ? t(titleKey, titleDefault)
    : short
      ? t('advika.whatsapp.titleShort', "Can't find the part?")
      : t('advika.whatsapp.title', 'Not sure what fits your truck?');
  const subtitle = subtitleKey
    ? t(subtitleKey, subtitleDefault)
    : t('advika.whatsapp.subtitle', 'Send your vehicle model on WhatsApp — reply in 10 minutes');

  return (
    <a
      href={`${BRAND_WHATSAPP_URL}?text=${encodeURIComponent(title)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-[13px] rounded bg-advika-whatsapp px-4 py-4 text-white ${className}`}
    >
      <Icon name="chat" size={26} />
      <span className="flex-1">
        <span className="block text-[13px] font-bold">{title}</span>
        <span className="block text-[11.5px] text-advika-whatsapp-tint">
          {subtitle}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white px-3 py-2 text-[12px] font-bold text-advika-whatsapp">
        {t('advika.whatsapp.cta', 'CHAT')}
      </span>
    </a>
  );
}
