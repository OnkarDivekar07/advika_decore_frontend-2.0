// src/components/Product/Breadcrumb.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '@/contexts/LanguageContext';
import { FiChevronRight } from 'react-icons/fi';

const getTranslated = (input, lang) => {
  if (typeof input === 'object' && input !== null) return input[lang] || input.en || 'Unnamed';
  return input || '';
};

export default function Breadcrumb({ categoryName, productName }) {
  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);

  const translatedCategory = categoryName ? t(`categories.${categoryName}`, categoryName) : '';
  const translatedProduct  = getTranslated(productName, language);

  const items = [
    { label: t('home', 'Home'), href: '/' },
    ...(translatedCategory ? [{ label: translatedCategory, href: `/products?category=${encodeURIComponent(categoryName)}` }] : []),
    { label: translatedProduct || t('unnamedProduct', 'Product'), href: null },
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
