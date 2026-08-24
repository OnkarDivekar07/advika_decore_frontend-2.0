import { useEffect, useState } from 'react';
import { saveLanguage } from '../utils/languageUtils';

const useLanguageGate = () => {
  const [showModal, setShowModal] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const lang = localStorage.getItem('preferredLanguage');

    if (!lang) {
      setTimeout(() => {
        setShowModal(true);
      }, 1000);
    } else {
      loadI18n(lang);
    }
  }, []);

  const loadI18n = async (lang) => {
    const { loadLanguage } = await import('../i18n'); // Lazy-load i18n
    await loadLanguage(lang);
    setI18nReady(true);
  };

  const handleSelect = async (lang) => {
    saveLanguage(lang);
    setShowModal(false);
    await loadI18n(lang); // Only init after language is chosen
  };

  return { showModal, handleSelect, i18nReady };
};

export default useLanguageGate;
