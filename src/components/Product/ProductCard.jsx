// src/components/Product/ProductCard.jsx
import React, { useCallback, useState } from 'react';
import { FiHeart, FiShoppingCart, FiLoader } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import { useCart } from '@/contexts/CartContext';
import { getLocalized } from '@/utils/i18nUtils';

export default function ProductCard({ product }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const lang = i18n.language || 'en';
  const name = getLocalized(product?.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product');
  const imageUrl = product?.images?.[0] || null;

  const handleNavigate = useCallback(() => {
    navigate(`/product/${product.id}`);
  }, [navigate, product.id]);

  const handleWishlist = useCallback((e) => {
    e.stopPropagation();
    // wishlist logic placeholder
  }, []);

  const handleAddToCart = useCallback(
    async (e) => {
      e.stopPropagation();
      if (isAdding) return;
      setIsAdding(true);
      try {
        await addItem(product, 1);
        toast.success(t('productDetail.addedToCart', 'Added to cart!'));
      } catch {
        // CartContext already surfaces an error toast (including
        // stale-stock conflicts) — nothing further to do here.
      } finally {
        setIsAdding(false);
      }
    },
    [addItem, isAdding, product, t]
  );

  return (
    <article
      className="card group cursor-pointer overflow-hidden flex flex-col"
      onClick={handleNavigate}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleNavigate()}
      role="button"
      aria-label={`View ${name}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-square bg-gray-50">
        <ImageWithFallback
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Wishlist overlay */}
        <button
          title="Add to Wishlist"
          aria-label="Add to Wishlist"
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-500 hover:text-red-500 hover:bg-white shadow-sm transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <FiHeart className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{name}</h3>
        <p className="text-base font-bold text-gray-900 mt-auto">₹{product.price}</p>
        <button
          aria-label={t('buttons.addToCart', 'Add to Cart')}
          onClick={handleAddToCart}
          disabled={isAdding}
          className="btn btn-primary w-full text-sm py-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <FiLoader className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <FiShoppingCart className="w-4 h-4" aria-hidden />
          )}
          {isAdding ? t('buttons.addingToCart', 'Adding…') : t('buttons.addToCart', 'Add to Cart')}
        </button>
      </div>
    </article>
  );
}
