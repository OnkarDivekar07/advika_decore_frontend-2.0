// src/pages/Cart/CartPage.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FiShoppingBag, FiAlertTriangle } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import CartItem from '@/components/Cart/CartItem';
import CartSummary from '@/components/Cart/CartSummary';
import Spinner from '@/components/Shared/Spinner';
import { useCart } from '@/contexts/CartContext';

export default function CartPage() {
  const { t } = useTranslation();
  const {
    items: cartItems,
    updateQuantity,
    removeItem,
    isSyncing,
    loadError,
    retryLoadCart,
  } = useCart();
  // Local-only: disables the retry button and swaps its label while a
  // retry is in flight, without needing a second global loading flag —
  // `isSyncing` already covers that (retryLoadCart re-triggers the same
  // sync), this just keeps the button itself from being spammed.
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryLoadCart();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="section-title mb-8">{t('cart.title', 'Your Cart')}</h1>

        {isSyncing ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Spinner size={40} />
            <p className="text-gray-500 text-sm">
              {t('cart.syncing', 'Syncing your cart…')}
            </p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <FiAlertTriangle className="w-12 h-12 text-red-300" aria-hidden />
            <div>
              <p className="text-gray-700 text-lg font-medium">
                {t('cart.loadError', "We couldn't load your cart.")}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {t('cart.loadErrorHint', 'Check your connection and try again.')}
              </p>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="btn btn-primary px-6 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRetrying ? t('cart.retrying', 'Retrying…') : t('cart.retry', 'Try again')}
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <FiShoppingBag className="w-12 h-12 text-gray-300" aria-hidden />
            <p className="text-gray-500 text-lg">{t('cart.empty', 'Your cart is empty.')}</p>
            <Link to="/" className="btn btn-primary px-6">
              {t('cart.continueShopping', 'Continue Shopping')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Items */}
            <section
              className="flex-1 flex flex-col gap-4"
              aria-label={t('cart.itemsSection', 'Cart items')}
            >
              {cartItems.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  onQuantityChange={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </section>

            {/* Summary */}
            <CartSummary items={cartItems} />
          </div>
        )}
      </main>
    </>
  );
}
