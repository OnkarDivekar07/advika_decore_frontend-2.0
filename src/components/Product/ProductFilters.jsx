// src/components/Product/ProductFilters.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle } from 'react-icons/fi';
import { PRODUCT_CATEGORIES } from '@/utils/constants';

/**
 * Pure, controlled filter panel — category checkboxes, price range, and
 * in-stock toggle. Rendered as-is in the desktop sidebar, and inside the
 * mobile drawer, so filter logic/markup only lives in one place.
 */
export default function ProductFilters({
  selectedCategories,
  onToggleCategory,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  priceRangeError,
  inStock,
  onToggleInStock,
  onClear,
  hasActiveFilters,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">{t('products.filters', 'Filters')}</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-semibold text-[var(--clr-primary-dark)] hover:underline"
          >
            {t('products.clearFilters', 'Clear all')}
          </button>
        )}
      </div>

      {/* Category */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-gray-800 mb-1">
          {t('products.category', 'Category')}
        </legend>
        {PRODUCT_CATEGORIES.map((cat) => (
          <label key={cat} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedCategories.includes(cat)}
              onChange={() => onToggleCategory(cat)}
              className="w-4 h-4 rounded border-gray-300 text-[var(--clr-primary-dark)] focus-visible:outline-2 focus-visible:outline-primary"
            />
            {t(`categories.${cat.toLowerCase().replace(/\s/g, '')}`, cat)}
          </label>
        ))}
      </fieldset>

      {/* Price */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-gray-800 mb-1">
          {t('products.price', 'Price')}
        </legend>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 flex-1 rounded-lg border px-2.5 py-2 focus-within:border-primary ${
              priceRangeError ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <span className="text-gray-400 text-sm">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder={t('products.min', 'Min')}
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              aria-label={t('products.min', 'Min')}
              aria-invalid={priceRangeError || undefined}
              className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
            />
          </div>
          <span className="text-gray-400 text-sm">–</span>
          <div
            className={`flex items-center gap-1 flex-1 rounded-lg border px-2.5 py-2 focus-within:border-primary ${
              priceRangeError ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <span className="text-gray-400 text-sm">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder={t('products.max', 'Max')}
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              aria-label={t('products.max', 'Max')}
              aria-invalid={priceRangeError || undefined}
              className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>
        {priceRangeError && (
          <p className="flex items-center gap-1.5 text-xs text-red-600" role="alert">
            <FiAlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {t('products.priceRangeError', 'Min price cannot be greater than max price.')}
          </p>
        )}
      </fieldset>

      {/* Stock */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3">
          {t('products.availability', 'Availability')}
        </legend>
        <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inStock}
            onChange={onToggleInStock}
            className="w-4 h-4 rounded border-gray-300 text-[var(--clr-primary-dark)] focus-visible:outline-2 focus-visible:outline-primary"
          />
          {t('products.inStockOnly', 'In stock only')}
        </label>
      </fieldset>
    </div>
  );
}
