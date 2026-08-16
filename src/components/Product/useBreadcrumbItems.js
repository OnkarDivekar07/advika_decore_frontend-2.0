// src/components/Product/useBreadcrumbItems.js
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '@/contexts/LanguageContext';
import { getLocalized } from '@/utils/i18nUtils';

/**
 * Builds the { label, href } breadcrumb trail for a product page. Pulled
 * out of Breadcrumb.jsx so ProductDetailPage's BreadcrumbList JSON-LD can
 * be built from the exact same items the visible <Breadcrumb> renders —
 * one source of truth, so the structured data can never say something
 * different from what's on the page.
 *
 * @param {string|object} categoryName
 * @param {string|object} productName
 * @returns {{ label: string, href: string|null }[]}
 */
export function useBreadcrumbItems(categoryName, productName) {
  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);

  // `categoryName` may come through as a plain string or as a
  // { en, hi, mr, ... } localization map (same shape as `productName`),
  // so normalize it to a canonical English string before doing any
  // string ops on it. PRODUCT_CATEGORIES / the API filter param expect
  // this display-cased English form (e.g. "Two Wheeler"), while the i18n
  // lookup key is that string lowercased with spaces stripped
  // (e.g. "twowheeler" - see i18n/*.json `categories`).
  const rawCategory = typeof categoryName === 'string' ? categoryName : getLocalized(categoryName, 'en');
  const categoryKey = rawCategory ? rawCategory.toLowerCase().replace(/\s+/g, '') : '';
  const translatedCategory = rawCategory ? t(`categories.${categoryKey}`, rawCategory) : '';
  const translatedProduct = getLocalized(productName, language);

  return [
    { label: t('common.home', 'Home'), href: '/' },
    ...(translatedCategory
      ? [{ label: translatedCategory, href: `/products?category=${encodeURIComponent(rawCategory)}` }]
      : []),
    { label: translatedProduct || t('productDetail.unnamedProduct', 'Product'), href: null },
  ];
}
