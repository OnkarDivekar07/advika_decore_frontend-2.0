// src/components/Product/ProductCard.jsx
import React, { useCallback, useState } from 'react';
import { FiHeart, FiShoppingCart, FiLoader } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { getLocalized } from '@/utils/i18nUtils';
import { buildProductPath } from '@/seo/seoUtils';

function ProductCard({ product }) {
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);

  const lang = i18n.language || 'en';
  const name = getLocalized(product?.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product');
  const imageUrl = product?.images?.[0] || null;
  const wishlisted = isWishlisted(product.id);

  const handleWishlist = useCallback(
    async (e) => {
      e.stopPropagation();
      if (isWishlistPending) return;
      // Wishlisting a product never requires signing in — same as
      // adding to cart (see handleAddToCart below): the guest wishlist
      // lives in localStorage and is merged into the account's wishlist
      // automatically at login (see WishlistContext.jsx). Only checkout
      // is gated behind auth.
      setIsWishlistPending(true);
      try {
        await toggleWishlist(product);
        toast.success(
          wishlisted
            ? t('productDetail.removedFromWishlist', 'Removed from wishlist.')
            : t('productDetail.addedToWishlist', 'Added to wishlist!')
        );
      } catch {
        // WishlistContext already surfaced a toast — nothing else to do.
      } finally {
        setIsWishlistPending(false);
      }
    },
    [isWishlistPending, toggleWishlist, product, wishlisted, t]
  );

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
    // Card itself is no longer a role="button" wrapper — it used to put a
    // click/keydown-driven "button" around the whole card while also
    // nesting two real <button>s inside it, which is an invalid (and
    // confusing for screen readers) interactive-inside-interactive
    // structure, and only handled Enter, not Space, for keyboard users.
    // Instead, a full-card <Link> (a native, natively-keyboard-operable
    // anchor) is stretched over the card via absolute positioning, and
    // the wishlist / add-to-cart buttons sit in their own stacking
    // context above it (pointer-events + z-index below) so they stay
    // independently clickable and remain siblings of the link rather
    // than descendants of it. Visually this is unchanged.
    <article className="relative card group overflow-hidden flex flex-col">
      <Link
        to={buildProductPath(product, name)}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={`${t('productDetail.viewProduct', 'View')} ${name}`}
      />

      {/* Image */}
      <div className="relative overflow-hidden aspect-square bg-gray-50 pointer-events-none">
        <ImageWithFallback
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Wishlist overlay */}
        <button
          title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-label={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-pressed={wishlisted}
          onClick={handleWishlist}
          disabled={isWishlistPending}
          className={`relative z-10 pointer-events-auto absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm shadow-sm transition-colors focus-visible:opacity-100 disabled:opacity-60 ${
            wishlisted
              ? 'bg-white text-red-500 opacity-100'
              // Always visible on touch/mobile — "opacity-0 until hover"
              // only makes sense on a pointer that can hover in the
              // first place; on a phone it made this control invisible
              // (and therefore undiscoverable) at all times. Only fades
              // in on hover from md and up, where a mouse is likely.
              : 'bg-white/80 text-gray-500 hover:text-red-500 hover:bg-white opacity-100 md:opacity-0 md:group-hover:opacity-100'
          }`}
        >
          <FiHeart className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1 pointer-events-none">
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{name}</h3>
        <p className="text-base font-bold text-gray-900 mt-auto">
          <span className="sr-only">{t('productDetail.price', 'Price')}: </span>
          ₹{product.price}
        </p>
        <button
          aria-label={`${t('buttons.addToCart', 'Add to Cart')} — ${name}`}
          onClick={handleAddToCart}
          disabled={isAdding}
          className="relative z-10 pointer-events-auto btn btn-primary w-full text-sm py-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
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

export default React.memo(ProductCard);
