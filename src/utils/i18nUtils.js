// utils/i18nUtils.js
//
// Pulls a display string out of a field that may be a plain string or a
// { en, hi, mr, ... } localization map. Returns '' when nothing is
// available so callers can supply their own *translated* fallback text
// (e.g. via t('productDetail.unnamedProduct')) instead of this shared
// helper silently baking in an English-only default.
export const getLocalized = (field, lang = 'en') => {
  if (field && typeof field === 'object') {
    return field[lang] || field.en || '';
  }
  return field || '';
};
