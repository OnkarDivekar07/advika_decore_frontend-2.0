import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getLanguage, saveLanguage } from '../utils/languageUtils';
import i18n from '../i18n'; // ✅ Import i18n instance

// eslint-disable-next-line react-refresh/only-export-components -- provider and context are intentionally colocated
export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(getLanguage());

  // ✅ Sync i18n with saved language on initial load
  useEffect(() => {
    i18n.changeLanguage(language);
    // Keeps <html lang> in sync so the :lang(hi)/:lang(mr) CSS selectors
    // that drive the Advika Auto per-language type scale (see index.css)
    // actually match — those rely on the ancestor lang attribute, not on
    // i18next's in-memory language state.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    saveLanguage(lang); // This also includes i18n.changeLanguage
  }, []);

  // Memoized so consumers (header, slide menu, checkout shell, …) only
  // re-render when the language actually changes, not on every render of
  // whatever happens to sit above this provider.
  const value = useMemo(() => ({ language, changeLanguage }), [language, changeLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
