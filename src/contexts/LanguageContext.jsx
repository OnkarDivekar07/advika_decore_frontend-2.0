import React, { createContext, useEffect, useState } from 'react';
import { getLanguage, saveLanguage } from '../utils/languageUtils';
import i18n from '../i18n'; // ✅ Import i18n instance

// eslint-disable-next-line react-refresh/only-export-components -- provider and context are intentionally colocated
export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(getLanguage());

  // ✅ Sync i18n with saved language on initial load
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    saveLanguage(lang); // This also includes i18n.changeLanguage
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
