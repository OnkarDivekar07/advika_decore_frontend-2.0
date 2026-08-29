// src/components/Layout/LanguageModal.jsx
//
// First-visit language chooser (Landing only) — see
// design_handoff_advika_auto/README.md "First-visit language modal".
// Also reopened from the slide-down menu's "Change language" row.
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { LanguageContext } from '@/contexts/LanguageContext';
import useModalA11y from '@/hooks/useModalA11y';

const OPTIONS = [
  { code: 'en', labelKey: 'advika.languageModal.english' },
  { code: 'hi', labelKey: 'advika.languageModal.hindi' },
  { code: 'mr', labelKey: 'advika.languageModal.marathi' },
];

export default function LanguageModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { changeLanguage } = useContext(LanguageContext);
  const dialogRef = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const choose = (code) => {
    changeLanguage(code);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/[.86] p-5"
      role="dialog"
      aria-modal="true"
      aria-label={t('advika.languageModal.title', 'भाषा चुनें')}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[340px] rounded-md border border-[#333] bg-advika-chrome shadow-advika-modal"
        style={{ borderTop: '4px solid #f97316', padding: '26px 20px 22px' }}
      >
        <div className="flex flex-col items-center gap-3 text-center mb-[18px]">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-lg bg-advika-orange">
            <Icon name="translate" className="text-white" size={26} />
          </div>
          <h2 className="aa-title-product text-white" style={{ fontSize: 20 }}>
            {t('advika.languageModal.title', 'भाषा चुनें')}
          </h2>
          <p className="text-[12.5px] text-advika-grey600">
            {t('advika.languageModal.subtitle', 'Choose your language · भाषा निवडा')}
          </p>
        </div>
        <div className="flex flex-col gap-[10px]">
          {OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => choose(opt.code)}
              data-testid={`language-modal-option-${opt.code}`}
              className="flex h-[58px] items-center gap-[13px] rounded-[5px] border-[1.5px] border-advika-border-dark4 px-4 text-left transition-colors hover:border-advika-orange"
            >
              <Icon name="translate" className="text-advika-orange" size={22} />
              <span className="flex-1 text-[16px] font-semibold text-white">{t(opt.labelKey)}</span>
              <Icon name="chevron_right" className="text-[#525252]" size={20} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
