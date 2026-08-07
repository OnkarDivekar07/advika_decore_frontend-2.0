// src/components/Product/ProductDetails.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiHeart } from 'react-icons/fi';
import QuantitySelector from './QuantitySelector';
import ActionButtons from '../Shared/ActionButtons';
import { addToCart, buyNow } from '@/features/cart/cartUtils';
import { toast } from 'react-toastify';

export default function ProductDetails({ product }) {
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const lang = i18n.language || 'en';
  const name = typeof product.name === 'object'
    ? product.name[lang] ?? product.name.en ?? 'Unnamed'
    : product.name ?? 'Unnamed';
  const description = typeof product.description === 'object'
    ? product.description[lang] ?? product.description.en ?? ''
    : product.description ?? '';

  const subtotal = (product.price * quantity).toFixed(2);

  const handleAddToCart = () => {
    const result = addToCart(product, quantity);
    if (result?.success) {
      toast.success(t('addedToCart', 'Added to cart!'));
      navigate('/cart');
    }
  };

  const handleBuyNow = () => {
    const result = buyNow(product, quantity);
    if (result?.success) navigate('/checkout');
  };

  return (
    <section className="md:w-1/2 flex flex-col gap-6">
      {/* Name & wishlist */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-gray-900 leading-tight">{name}</h1>
        <button
          onClick={() => toast.info(t('addedToWishlist', 'Added to wishlist!'))}
          className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 mt-0.5"
          aria-label={t('addToWishlist', 'Add to wishlist')}
        >
          <FiHeart className="w-5 h-5" />
        </button>
      </div>

      {/* Price */}
      <div className="text-3xl font-bold text-primary">₹{product.price}</div>

      {/* Description */}
      {description && (
        <div
          className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      )}

      <hr className="border-[var(--clr-border)]" />

      {/* Quantity & subtotal */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-gray-700">{t('quantity', 'Quantity')}</label>
        <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
        <p className="text-lg font-bold text-gray-800">
          {t('subtotal', 'Subtotal')}:&nbsp;
          <span className="text-primary">₹{subtotal}</span>
        </p>
      </div>

      {/* CTA */}
      <ActionButtons onBuyNow={handleBuyNow} onAddToCart={handleAddToCart} />
    </section>
  );
}
