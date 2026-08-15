// src/components/Product/Categories.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllProducts } from '@/services/productsService';
import ProductCard from './ProductCard';
import { useTranslation } from 'react-i18next';
import { handleError } from '@/utils/errorHandler';
import { PRODUCT_CATEGORIES as CATEGORIES } from '@/utils/constants';

export default function Categories() {
  const { t } = useTranslation();
  const [productsData, setProductsData] = useState({});
  const [active, setActive] = useState(CATEGORIES[0]);
  const [fade, setFade] = useState(true);
  const [loading, setLoading] = useState(true);
  const fadeTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const products = await fetchAllProducts();
        if (cancelled) return;
        const grouped = Object.fromEntries(CATEGORIES.map(cat => [cat, []]));
        products.forEach(p => {
          (Array.isArray(p.category) ? p.category : [p.category]).forEach(c => {
            if (grouped[c]) grouped[c].push(p);
          });
        });
        setProductsData(grouped);
      } catch (err) {
        if (!cancelled) handleError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback((cat) => {
    clearTimeout(fadeTimer.current);
    setFade(false);
    fadeTimer.current = setTimeout(() => {
      setActive(cat);
      setFade(true);
    }, 180);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const current = productsData[active] ?? [];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-7 flex items-end justify-between gap-3">
        <h2 className="section-title">{t('homepage.vehicleCategories')}</h2>
        <Link
          to={`/products?category=${encodeURIComponent(active)}`}
          className="text-sm font-semibold text-[var(--clr-primary-dark)] hover:underline shrink-0"
        >
          {t('homepage.viewAll', 'View all')}
        </Link>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Product categories">
        {CATEGORIES.map(cat => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              id={`category-tab-${cat}`}
              role="tab"
              aria-selected={isActive}
              aria-controls="category-tabpanel"
              onClick={() => handleSelect(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 ${
                isActive
                  ? 'bg-primary border-primary text-black shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-black'
              }`}
            >
              {t(`categories.${cat.toLowerCase().replace(/\s/g, '')}`, cat)}
            </button>
          );
        })}
      </div>

      {/* Products grid */}
      <div
        id="category-tabpanel"
        role="tabpanel"
        aria-labelledby={`category-tab-${active}`}
        aria-busy={loading}
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}
      >
        {loading && <span className="sr-only" role="status">{t('common.loading', 'Loading…')}</span>}
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)
          : current.length > 0
            ? current.map(prod => <ProductCard key={prod.id} product={prod} />)
            : <p className="col-span-full text-center text-gray-500 py-10">{t('homepage.noProducts', 'No products in this category.')}</p>
        }
      </div>
    </section>
  );
}
