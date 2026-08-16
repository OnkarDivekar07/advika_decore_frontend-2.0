// src/pages/ProductDetail/ProductDetailPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import Breadcrumb from '@/components/Product/Breadcrumb';
import ImageGallery from '@/components/Product/ImageGallery';
import ProductDetails from '@/components/Product/ProductDetails';
import RelatedProducts from '@/components/Product/RelatedProducts';
import Spinner from '@/components/Shared/Spinner';
import Seo from '@/components/Shared/Seo';
import { getProductById } from '@/services/productsService';
import { handleError } from '@/utils/errorHandler';
import { getLocalized } from '@/utils/i18nUtils';
import { getStockInfo } from '@/utils/productUtils';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { buildProductPath, htmlToMetaDescription, buildAbsoluteUrl } from '@/seo/seoUtils';
import { buildProductJsonLd, buildBreadcrumbJsonLd } from '@/seo/structuredData';
import { useBreadcrumbItems } from '@/components/Product/useBreadcrumbItems';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // A 404 (product deleted/never existed) is not something a "Try Again"
  // retry can ever fix — it'll just 404 again. Tracked separately so that
  // case can offer "Browse products" instead of a doomed retry loop.
  const [notFound, setNotFound] = useState(false);
  const lang = i18n.language || 'en';

  // Same items the visible <Breadcrumb> below renders (see
  // useBreadcrumbItems) — reused here so the BreadcrumbList JSON-LD can
  // never say something different from what's actually on the page.
  // Safe to call with an unset product: renders just "Home / Product".
  const breadcrumbItems = useBreadcrumbItems(product?.category, product?.name);

  const seoData = useMemo(() => {
    if (!product) return null;
    const name = getLocalized(product.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product');
    const rawDescription = getLocalized(product.description, lang);
    const metaDescription = htmlToMetaDescription(sanitizeHtml(rawDescription));
    const stock = getStockInfo(product);
    const price = Number(product.price);
    const canonicalPath = buildProductPath(product, name);
    const category = typeof product.category === 'string' ? product.category : getLocalized(product.category, 'en');

    return {
      name,
      metaDescription,
      canonicalPath,
      image: product.images?.[0],
      jsonLd: [
        buildProductJsonLd({
          name,
          description: metaDescription,
          images: product.images ?? [],
          sku: product.id,
          price: Number.isFinite(price) ? price : null,
          stock,
          url: buildAbsoluteUrl(canonicalPath),
          category,
        }),
        buildBreadcrumbJsonLd(breadcrumbItems),
      ],
    };
  }, [product, lang, t, breadcrumbItems]);

  // Pulled out of the effect so the Retry button can re-run the exact
  // same fetch instead of duplicating it.
  const fetchProduct = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await getProductById(id);
        if (!signal?.aborted) setProduct(data);
      } catch (err) {
        if (!signal?.aborted) {
          if (err?.response?.status === 404) {
            // Expected outcome (deleted/delisted product, stale link), not
            // an unexpected failure — don't toast it as one.
            setNotFound(true);
          } else {
            handleError(err);
            setError(t('productDetail.errorLoadingProduct', 'Failed to load product. Please try again.'));
          }
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
      {seoData && (
        <Seo
          title={seoData.name}
          description={seoData.metaDescription}
          canonicalPath={seoData.canonicalPath}
          image={seoData.image}
          ogType="product"
          jsonLd={seoData.jsonLd}
        />
      )}
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
        {notFound && !loading && (
          <div className="flex flex-col items-center text-center gap-3 py-20" role="alert">
            <FiAlertCircle className="w-12 h-12 text-gray-400" aria-hidden />
            <p className="text-gray-600 font-medium">
              {t('productDetail.notFound', "This product is no longer available.")}
            </p>
            <button onClick={() => navigate('/products')} className="btn btn-outline mt-1">
              {t('productDetail.browseProducts', 'Browse products')}
            </button>
          </div>
        )}
        {error && !loading && !notFound && (
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
