// src/components/Shared/ActionButtons.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiShoppingCart, FiZap } from 'react-icons/fi';

export default function ActionButtons({
  onBuyNow,
  onAddToCart,
  isAddingToCart = false,
  isBuyNowPending = false,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <button
        type="button"
        onClick={onBuyNow}
        disabled={isBuyNowPending}
        className="btn btn-primary flex-1 py-3 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FiZap className="w-4 h-4" aria-hidden />
        {isBuyNowPending ? t('buttons.processing', 'Processing…') : t('buttons.buyNow', 'Buy Now')}
      </button>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={isAddingToCart}
        className="btn btn-outline flex-1 py-3 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FiShoppingCart className="w-4 h-4" aria-hidden />
        {isAddingToCart
          ? t('buttons.addingToCart', 'Adding…')
          : t('buttons.addToCart', 'Add to Cart')}
      </button>
    </div>
  );
}
