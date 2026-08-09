// src/components/Product/RelatedProducts.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRelatedProducts } from '@/services/productsService';
import { getLocalized } from '@/utils/i18nUtils';
import { handleError } from '@/utils/errorHandler';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';

const SKELETON_COUNT = 4;

export default function RelatedProducts({ currentProductId }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';

  useEffect(() => {
    if (!currentProductId) return;
    let cancelled = false;
    setLoading(true);
    getRelatedProducts(currentProductId)
      .then(res => { if (!cancelled) setRelated(Array.isArray(res) ? res : []); })
      .catch(err => { if (!cancelled) handleError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentProductId]);

  if (!loading && related.length === 0) return null;

  return (
    <section className="mt-14 max-w-7xl mx-auto px-4 sm:px-6" aria-label="Related products">
      <div className="mb-5">
        <h2 className="section-title">{t('productDetail.relatedProducts', 'Related Products')}</h2>
      </div>
      <div className="scroll-strip">
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="skeleton w-44 sm:w-52 h-64 shrink-0" />
            ))
          : related.map(product => {
              const name = getLocalized(product.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product');
              const image = product.images?.[0] || null;
              return (
                <article
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="card w-44 sm:w-52 cursor-pointer overflow-hidden shrink-0"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/product/${product.id}`)}
                  role="button"
                  aria-label={t('productDetail.viewProduct', 'View {{name}}', { name })}
                >
                  <ImageWithFallback
                    src={image}
                    alt={name}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2">{name}</p>
                    <p className="text-primary font-bold mt-1 text-sm">₹{product.price}</p>
                  </div>
                </article>
              );
            })
        }
      </div>
    </section>
  );
}
