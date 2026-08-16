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
  // Distinct from an empty catalog: a failed fetch shouldn't render as
  // "No products found" — that tells the customer something false (there
  // genuinely are new arrivals; we just couldn't reach them) and offers
  // no way to recover short of a full page reload.
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const data = await fetchNewArrivals();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(true);
          handleError(err, 'Could not load new arrivals.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryNonce]);

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
          : error
            ? (
              <div className="col-span-full flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-gray-600">{t('homepage.loadError', "Couldn't load new arrivals.")}</p>
                <button
                  type="button"
                  onClick={() => setRetryNonce((n) => n + 1)}
                  className="btn btn-outline px-6"
                >
                  {t('buttons.retry', 'Retry')}
                </button>
              </div>
            )
            : products.length > 0
              ? products.map(product => <ProductCard key={product.id} product={product} />)
              : <p className="col-span-full text-center text-gray-500 py-10">{t('homepage.noProducts', 'No products found.')}</p>
        }
      </div>
    </section>
  );
}
