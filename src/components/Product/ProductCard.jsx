// src/components/Product/ProductCard.jsx
import React, { useCallback } from 'react';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const lang = i18n.language || 'en';
  const name       = product?.name?.[lang]        ?? product?.name?.en        ?? product?.name        ?? 'Unnamed';
  const imageUrl   = product?.images?.[0] || '/placeholder.jpg';

  const handleNavigate = useCallback(() => {
    navigate(`/product/${product.id}`);
  }, [navigate, product.id]);

  const handleWishlist = useCallback((e) => {
    e.stopPropagation();
    // wishlist logic placeholder
  }, []);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    // cart logic placeholder
  }, []);

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
        <img
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
          aria-label="Add to Cart"
          onClick={handleAddToCart}
          className="btn btn-primary w-full text-sm py-2 mt-1"
        >
          <FiShoppingCart className="w-4 h-4" aria-hidden />
          Add to Cart
        </button>
      </div>
    </article>
  );
}
