// src/components/Shared/LanguageSelectorModal.jsx
import React, { useEffect } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी',  flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी',   flag: '🇮🇳' },
];

const LanguageSelectorModal = ({ onSelectLanguage }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Language selection"
    >
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl w-full max-w-xs border-t-4 border-primary">
        <h2 className="font-display text-xl font-bold text-center text-gray-900 mb-2">
          Welcome to Advika Decore
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">Choose your preferred language</p>
        <div className="flex flex-col gap-3">
          {LANGUAGES.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => onSelectLanguage(code)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 font-medium text-gray-800 hover:border-primary hover:bg-primary/10 transition-all text-left"
            >
              <span className="text-xl">{flag}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectorModal;
