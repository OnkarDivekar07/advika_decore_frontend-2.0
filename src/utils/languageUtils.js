const LANGUAGE_KEY = 'preferredLanguage';
import i18n from '../i18n';

export const getLanguage = () => localStorage.getItem(LANGUAGE_KEY) || 'en';
export const saveLanguage = (lang) => {
  localStorage.setItem('preferredLanguage', lang);
  i18n.changeLanguage(lang); // ✅ apply immediately
};
