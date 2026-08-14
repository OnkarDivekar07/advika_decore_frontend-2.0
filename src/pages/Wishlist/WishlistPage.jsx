// src/pages/Wishlist/WishlistPage.jsx
//
// /wishlist — saved-for-later products. Available to guests (backed by
// localStorage) exactly like /cart is — see WishlistContext.jsx for the
// guest/backend split — so this page does NOT bounce anonymous visitors
// away the way AddressBookPage/OrderListPage do; there's simply nothing
// to load from the backend for them yet.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiHeart } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import Spinner from '@/components/Shared/Spinner';
import WishlistCard from '@/components/Wishlist/WishlistCard';
import { useWishlist } from '@/contexts/WishlistContext';

export default function WishlistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, isSyncing, loadError, retryLoad, removeItem, mutatingIds } = useWishlist();

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="section-title mb-2">{t('wishlist.title', 'My Wishlist')}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {t('wishlist.subtitle', 'Products you have saved for later.')}
        </p>

        {isSyncing ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Spinner size={40} />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <FiAlertTriangle className="w-12 h-12 text-red-300" aria-hidden />
            <p className="text-gray-600">
              {t('wishlist.loadError', "We couldn't load your wishlist.")}
            </p>
            <button onClick={retryLoad} className="btn btn-outline px-6">
              {t('buttons.retry', 'Retry')}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="card p-8 flex flex-col items-center text-center gap-3">
            <FiHeart className="w-10 h-10 text-gray-300" aria-hidden />
            <p className="text-gray-600">
              {t('wishlist.empty', "You haven't saved anything yet.")}
            </p>
            <button onClick={() => navigate('/products')} className="btn btn-primary px-6 mt-2">
              {t('wishlist.startShopping', 'Browse Products')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <WishlistCard
                key={item.productId}
                product={item.product}
                onRemove={removeItem}
                isRemoving={mutatingIds.has(item.productId)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
