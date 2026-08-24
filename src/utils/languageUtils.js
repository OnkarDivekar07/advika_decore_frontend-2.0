const LANGUAGE_KEY = 'preferredLanguage';
import { loadLanguage } from '../i18n';

export const getLanguage = () => localStorage.getItem(LANGUAGE_KEY) || 'en';
export const saveLanguage = (lang) => {
  localStorage.setItem('preferredLanguage', lang);
  loadLanguage(lang); // apply immediately (async for hi/mr — see src/i18n/index.js)
};
