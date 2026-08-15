// src/components/Product/NewArrivals.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ProductCard from './ProductCard';
import { handleError } from '@/utils/errorHandler';
import { fetchNewArrivals } from '@/services/productsService';

const SKELETON_COUNT = 4;

export default function NewArrivals() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchNewArrivals();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) handleError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-7">
        <h2 className="section-title">{t('homepage.newArrivals')}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5" aria-busy={loading}>
        {loading && <span className="sr-only" role="status">{t('common.loading', 'Loading…')}</span>}
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
              <div key={idx} className="skeleton aspect-[3/4]" />
            ))
          : products.length > 0
            ? products.map(product => <ProductCard key={product.id} product={product} />)
            : <p className="col-span-full text-center text-gray-500 py-10">{t('homepage.noProducts', 'No products found.')}</p>
        }
      </div>
    </section>
  );
}
