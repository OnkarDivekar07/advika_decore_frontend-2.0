// src/pages/ProductDetail/ProductDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar/Navbar';
import Breadcrumb from '@/components/Product/Breadcrumb';
import ImageGallery from '@/components/Product/ImageGallery';
import ProductDetails from '@/components/Product/ProductDetails';
import RelatedProducts from '@/components/Product/RelatedProducts';
import Spinner from '@/components/Shared/Spinner';
import { getProductById } from '@/services/productsService';
import { handleError } from '@/utils/errorHandler';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getProductById(id);
        if (!cancelled) setProduct(data);
      } catch (err) {
        if (!cancelled) {
          handleError(err);
          setError(t('errorLoadingProduct', 'Failed to load product. Please try again.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, t]);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex justify-center py-24">
            <Spinner size={48} />
          </div>
        )}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}
        {product && !loading && (
          <>
            <Breadcrumb productName={product.name} />
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
              <ImageGallery images={product.images ?? []} />
              <ProductDetails product={product} />
            </div>
            <RelatedProducts currentProductId={id} />
          </>
        )}
      </main>
    </>
  );
}
