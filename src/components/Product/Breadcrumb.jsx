// src/components/Product/Breadcrumb.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '@/contexts/LanguageContext';
import { getLocalized } from '@/utils/i18nUtils';
import { FiChevronRight } from 'react-icons/fi';

export default function Breadcrumb({ categoryName, productName }) {
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

  const items = [
    { label: t('common.home', 'Home'), href: '/' },
    ...(translatedCategory
      ? [{ label: translatedCategory, href: `/products?category=${encodeURIComponent(rawCategory)}` }]
      : []),
    { label: translatedProduct || t('productDetail.unnamedProduct', 'Product'), href: null },
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-1">
            {idx > 0 && <FiChevronRight className="text-gray-300 shrink-0" aria-hidden />}
            {item.href ? (
              <Link
                to={item.href}
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-gray-800 truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
