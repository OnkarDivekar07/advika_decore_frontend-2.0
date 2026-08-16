// src/components/Wishlist/WishlistCard.jsx
//
// A single saved product on the Wishlist page. Deliberately its own
// (simpler) component rather than reusing ProductCard: this needs a
// remove button, a "move to cart" action, and an unavailable-product
// state, and no wishlist-heart-toggle (it's already wishlisted by
// definition here).
import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FiShoppingCart, FiLoader, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import { useCart } from '@/contexts/CartContext';
import { getLocalized } from '@/utils/i18nUtils';
import { getStockInfo, formatPrice } from '@/utils/productUtils';
import { buildProductPath } from '@/seo/seoUtils';

function WishlistCard({ product, onRemove, isRemoving }) {
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const [isMoving, setIsMoving] = useState(false);

  const lang = i18n.language || 'en';

  // A wishlisted product that's since been deleted/delisted should never
  // reach this component in practice — both the backend's getWishlist
  // (see wishlist.service.js) and the guest-mode revalidation (see
  // WishlistContext.jsx) sweep those out proactively — but a product
  // snapshot missing its own name/price (a stale/corrupted localStorage
  // entry, or a revalidation that hasn't run yet this session) is still
  // possible, so render a clearly "unavailable" card with only a Remove
  // action instead of crashing on `formatPrice(NaN)` or linking to a
  // dead product page.
  const isUnavailable = !product || !product.id || !product.name;

  const name = isUnavailable
    ? t('wishlist.unavailableProduct', 'Product no longer available')
    : getLocalized(product.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product');
  const imageUrl = product?.images?.[0] || null;
  const stock = getStockInfo(product);
  const priceValue = Number(product?.price);
  const hasValidPrice = !isUnavailable && Number.isFinite(priceValue);

  const handleMoveToCart = useCallback(
    async (e) => {
      e.preventDefault();
      if (isMoving || isRemoving || !stock.available) return;
      setIsMoving(true);
      try {
        await addItem(product, 1);
        await onRemove(product.id);
        toast.success(t('wishlist.movedToCart', 'Moved to cart!'));
      } catch {
        // CartContext/WishlistContext already surface their own error
        // toasts on failure — nothing further to do here.
      } finally {
        setIsMoving(false);
      }
    },
    [addItem, onRemove, isMoving, isRemoving, stock.available, product, t]
  );

  const handleRemove = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        await onRemove(product?.id);
      } catch {
        // WishlistContext already surfaced a toast — nothing else to do.
      }
    },
    [onRemove, product?.id]
  );

  const body = (
    <>
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center pointer-events-none">
        {isUnavailable ? (
          <FiAlertCircle className="w-8 h-8 text-gray-300" aria-hidden />
        ) : (
          <ImageWithFallback src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`text-sm sm:text-base font-semibold leading-snug line-clamp-2 pointer-events-none ${
              isUnavailable ? 'text-gray-500 italic' : 'text-gray-800'
            }`}
          >
            {name}
          </h3>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            aria-label={t('wishlist.remove', 'Remove from wishlist')}
            className="relative z-10 pointer-events-auto p-1.5 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-60"
          >
            {isRemoving ? (
              <FiLoader className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <FiTrash2 className="w-4 h-4" aria-hidden />
            )}
          </button>
        </div>

        {isUnavailable ? (
          <p className="text-xs text-gray-500 mt-1 pointer-events-none">
            {t('wishlist.unavailableHint', 'This item can no longer be ordered.')}
          </p>
        ) : (
          <>
            {hasValidPrice && (
              <p className="text-base font-bold text-gray-900 mt-1 pointer-events-none">₹{formatPrice(priceValue)}</p>
            )}

            {!stock.available && (
              <p className="text-xs font-semibold text-red-600 mt-1 pointer-events-none">
                {t('productDetail.outOfStock', 'Out of Stock')}
              </p>
            )}
            {stock.available && stock.isLow && (
              <p className="text-xs font-semibold text-amber-600 mt-1 pointer-events-none">
                {stock.quantity != null
                  ? t('productDetail.lowStock', 'Only {{count}} left in stock', { count: stock.quantity })
                  : t('productDetail.lowStockGeneric', 'Low stock')}
              </p>
            )}

            <button
              onClick={handleMoveToCart}
              disabled={isMoving || isRemoving || !stock.available}
              title={
                !stock.available
                  ? t('productDetail.outOfStock', 'Out of Stock')
                  : t('wishlist.moveToCart', 'Move to Cart')
              }
              className="relative z-10 pointer-events-auto btn btn-primary text-xs sm:text-sm py-1.5 sm:py-2 px-3 mt-auto self-start disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isMoving ? (
                <FiLoader className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <FiShoppingCart className="w-3.5 h-3.5" aria-hidden />
              )}
              {isMoving
                ? t('wishlist.moving', 'Moving…')
                : t('wishlist.moveToCart', 'Move to Cart')}
            </button>
          </>
        )}
      </div>
    </>
  );

  if (isUnavailable) {
    return <div className="card flex gap-3 p-3 sm:p-4 opacity-75">{body}</div>;
  }

  return (
    // relative + a full-card stretched <Link> (absolute, z-0) rather than
    // wrapping the whole card (including the Remove / Move-to-cart
    // <button>s) in the <Link> itself — nesting real buttons inside an
    // <a> isn't valid HTML and browsers handle the resulting DOM
    // inconsistently. The two buttons opt back into pointer events and
    // sit above the link (z-10) so they stay independently clickable.
    <div className="relative card flex gap-3 p-3 sm:p-4 hover:shadow-md transition-shadow">
      <Link
        to={buildProductPath(product, name)}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={name}
      />
      {body}
    </div>
  );
}

export default React.memo(WishlistCard);
