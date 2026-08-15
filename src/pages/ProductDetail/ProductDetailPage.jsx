// src/pages/ProductDetail/ProductDetailPage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
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
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pulled out of the effect so the Retry button can re-run the exact
  // same fetch instead of duplicating it.
  const fetchProduct = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProductById(id);
        if (!signal?.aborted) setProduct(data);
      } catch (err) {
        if (!signal?.aborted) {
          handleError(err);
          setError(t('productDetail.errorLoadingProduct', 'Failed to load product. Please try again.'));
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id, t]
  );

  useEffect(() => {
    if (!id) return;
    const controller = { aborted: false };
    fetchProduct(controller);
    return () => { controller.aborted = true; };
  }, [id, fetchProduct]);

  // Goes back in history when there's somewhere to go back to (e.g.
  // arrived via a product listing / search / related-products click);
  // falls back to the home page for a page that was opened directly
  // (shared link, new tab, refresh with no prior entry).
  const handleBack = useCallback(() => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8" id="main-content" tabIndex={-1}>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <FiArrowLeft className="w-4 h-4" aria-hidden />
          {t('productDetail.back', 'Back')}
        </button>

        {loading && (
          <div className="flex justify-center py-24">
            <Spinner size={48} />
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center text-center gap-3 py-20" role="alert">
            <FiAlertCircle className="w-12 h-12 text-red-400" aria-hidden />
            <p className="text-red-500 font-medium">{error}</p>
            <button onClick={() => fetchProduct()} className="btn btn-outline mt-1">
              <FiRefreshCw className="w-4 h-4" aria-hidden />
              {t('productDetail.retry', 'Try Again')}
            </button>
          </div>
        )}
        {product && !loading && (
          <>
            <Breadcrumb categoryName={product.category} productName={product.name} />
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
