// src/pages/Orders/OrderListPage.jsx
//
// /orders — "My Orders": a paginated list of the logged-in user's placed
// orders (see useOrderHistory / GET /api/order/history), newest first.
// Never shows the in-progress draft order (that's the cart/checkout flow's
// concern, not this page's). Each row (OrderCard) links through to the
// order's own detail page for the full breakdown + shipment tracking.
//
// Pagination follows the same ?page= URL convention as
// ProductListingPage — the number of pages loaded lives in the URL, not
// just component state, so a refresh, a shared link, or browser Back/
// Forward all reproduce the exact same "how much have I loaded" view
// instead of silently resetting to page 1.
import React, { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiPackage } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import Spinner from '@/components/Shared/Spinner';
import OrderCard from '@/components/Orders/OrderCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  useOrderHistory,
  STATUS_LOADING,
  STATUS_LOADING_MORE,
  STATUS_SUCCESS,
  STATUS_EMPTY,
  STATUS_ERROR,
} from '@/features/orders/hooks/useOrderHistory';

export default function OrderListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isRestoring } = useAuth();

  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const { status, orders, meta, hasMore, retry } = useOrderHistory(page);

  // Same belt-and-suspenders guard AddressBookPage uses: this page is
  // meaningless signed out, so bounce home the moment we're sure there's
  // no session, rather than rendering a page that has nothing to show.
  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isRestoring, isAuthenticated, navigate]);

  const handleLoadMore = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(page + 1));
        return next;
      },
      { replace: true }
    );
  }, [page, setSearchParams]);

  const handleRetry = useCallback(() => {
    // A failed request may have happened partway through a multi-page
    // load — reset back to page 1 in the URL too, so retry and the
    // hook's own re-fetch-from-1 behavior stay in sync.
    setSearchParams({}, { replace: true });
    retry();
  }, [retry, setSearchParams]);

  if (isRestoring || !isAuthenticated) return null;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12" id="main-content" tabIndex={-1}>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
          <h1 className="section-title">{t('orders.title', 'My Orders')}</h1>
          {meta?.total > 0 && (
            <p className="text-sm text-gray-500">
              {t('orders.resultsCount', 'Showing {{shown}} of {{total}} orders', {
                shown: orders.length,
                total: meta.total,
              })}
            </p>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {t('orders.subtitle', 'Track and review everything you have ordered.')}
        </p>

        {status === STATUS_LOADING ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Spinner size={40} />
          </div>
        ) : status === STATUS_ERROR ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center" role="alert">
            <FiAlertTriangle className="w-12 h-12 text-red-300" aria-hidden />
            <p className="text-gray-600">
              {t('orders.loadError', "We couldn't load your orders.")}
            </p>
            <button onClick={handleRetry} className="btn btn-outline px-6">
              {t('buttons.retry', 'Retry')}
            </button>
          </div>
        ) : status === STATUS_EMPTY ? (
          <div className="card p-8 flex flex-col items-center text-center gap-3">
            <FiPackage className="w-12 h-12 text-gray-300" aria-hidden />
            <p className="text-gray-600">
              {t('orders.empty', "You haven't placed any orders yet.")}
            </p>
            <button onClick={() => navigate('/products')} className="btn btn-primary px-6 mt-2">
              {t('orders.startShopping', 'Start Shopping')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={status === STATUS_LOADING_MORE}
                className="btn btn-outline self-center px-6 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === STATUS_LOADING_MORE
                  ? t('orders.loadingMore', 'Loading…')
                  : t('orders.loadMore', 'Load More')}
              </button>
            )}
          </div>
        )}
      </main>
    </>
  );
}
