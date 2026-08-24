import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";

// Only `en` (the default/fallback language below) ships in the initial JS
// chunk. hi/mr together are ~112KB of translation JSON that the majority of
// a first visit never needs — loadLanguage() below dynamically imports
// whichever one is actually selected, so the other stays unfetched entirely
// for a user who never switches away from English.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

const LOCALE_LOADERS = {
  hi: () => import("./hi.json"),
  mr: () => import("./mr.json"),
};

// Every language switch (LanguageContext, LanguageModal, the checkout/login
// header toggles) should go through this instead of calling
// i18n.changeLanguage directly — for `en` (already loaded at init) it's just
// that; for hi/mr it fetches and registers the bundle first (once —
// hasResourceBundle skips a re-fetch on every subsequent switch back to a
// language already loaded this session) so i18next never falls through to
// fallbackLng with missing-key warnings.
export const loadLanguage = async (lang) => {
  const loader = LOCALE_LOADERS[lang];
  if (loader && !i18n.hasResourceBundle(lang, "translation")) {
    const { default: resources } = await loader();
    i18n.addResourceBundle(lang, "translation", resources);
  }
  return i18n.changeLanguage(lang);
};

export default i18n;
