// utils/i18nUtils.js
export const getLocalized = (field, lang = 'en') => {
  if (typeof field === 'object') {
    return field?.[lang] || field?.en || 'Unnamed';
  }
  return field || '';
};
