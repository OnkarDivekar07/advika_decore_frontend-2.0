// src/components/Shared/ActionButtons.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiShoppingCart, FiZap } from 'react-icons/fi';

export default function ActionButtons({ onBuyNow, onAddToCart }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <button
        type="button"
        onClick={onBuyNow}
        className="btn btn-primary flex-1 py-3 text-sm sm:text-base"
      >
        <FiZap className="w-4 h-4" aria-hidden />
        {t('buttons.buyNow', 'Buy Now')}
      </button>
      <button
        type="button"
        onClick={onAddToCart}
        className="btn btn-outline flex-1 py-3 text-sm sm:text-base"
      >
        <FiShoppingCart className="w-4 h-4" aria-hidden />
        {t('buttons.addToCart', 'Add to Cart')}
      </button>
    </div>
  );
}
