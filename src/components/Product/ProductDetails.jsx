// src/components/Product/ProductDetails.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiHeart, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import QuantitySelector from './QuantitySelector';
import ActionButtons from '../Shared/ActionButtons';
import DeliveryChargeEstimate from '../Shipping/DeliveryChargeEstimate';
import PincodeServiceabilityCheck from '../Shipping/PincodeServiceabilityCheck';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { toast } from 'react-toastify';
import { getLocalized } from '@/utils/i18nUtils';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { getStockInfo, getProductUnit, formatPrice } from '@/utils/productUtils';

function StockBadge({ stock, t }) {
  if (!stock.available) {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 w-fit">
        <FiXCircle className="w-4 h-4" aria-hidden />
        {t('productDetail.outOfStock', 'Out of Stock')}
      </div>
    );
  }

  if (stock.isLow) {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 w-fit">
        <FiAlertTriangle className="w-4 h-4" aria-hidden />
        {stock.quantity != null
          ? t('productDetail.lowStock', 'Only {{count}} left in stock', { count: stock.quantity })
          : t('productDetail.lowStockGeneric', 'Low stock')}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 w-fit">
      <FiCheckCircle className="w-4 h-4" aria-hidden />
      {t('productDetail.inStock', 'In Stock')}
    </div>
  );
}

export default function ProductDetails({ product }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { addItem, setBuyNow } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { requireAuth } = useAuthGate();
  const lang = i18n.language || 'en';

  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyNowPending, setIsBuyNowPending] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);

  const stock = useMemo(() => getStockInfo(product), [product]);
  const unit = useMemo(() => getProductUnit(product, lang), [product, lang]);

  // Reset to a sane quantity whenever the product itself changes (e.g.
  // navigating from one product page straight to another), and again
  // whenever the stock ceiling changes so a stale quantity from a
  // previous product can never sneak past a lower stock count.
  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => {
    if (stock.quantity != null) {
      setQuantity((q) => Math.min(q, Math.max(1, stock.quantity)));
    }
  }, [stock.quantity]);

  const name = getLocalized(product.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product');
  const rawDescription = getLocalized(product.description, lang);
  const description = rawDescription ? sanitizeHtml(rawDescription) : '';

  const priceValue = Number(product.price);
  const hasValidPrice = Number.isFinite(priceValue);
  const formattedPrice = hasValidPrice ? formatPrice(priceValue) : null;
  const formattedSubtotal = hasValidPrice ? formatPrice(priceValue * quantity) : null;

  const handleAddToCart = async () => {
    if (!stock.available || isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      await addItem(product, quantity);
      toast.success(t('productDetail.addedToCart', 'Added to cart!'));
      navigate('/cart');
    } catch {
      // CartContext already surfaces a toast for the failure (including
      // stale-stock conflicts), so there's nothing further to do here —
      // just stay on the page instead of navigating to the cart.
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    // Same stock re-check as Add to Cart, plus a duplicate-click guard —
    // without it, a fast double-tap could call setBuyNow/requireAuth
    // twice before the first navigation lands.
    if (!stock.available || isBuyNowPending) return;
    setIsBuyNowPending(true);
    try {
      const ok = setBuyNow(product, quantity);
      if (!ok) {
        // Storage write failed or didn't stick (quota exceeded, private
        // browsing, etc.) — don't send the user to checkout with a
        // stale/missing purchase intent; let them retry instead.
        toast.error(
          t('productDetail.buyNowFailed', "Couldn't start checkout. Please try again.")
        );
        return;
      }
      // Checkout is gated the same way "Proceed to Checkout" is from the
      // cart — verify first, then land straight on the buy-now summary.
      requireAuth(() => navigate('/checkout?mode=buyNow'));
    } finally {
      setIsBuyNowPending(false);
    }
  };

  const wishlisted = isWishlisted(product.id);

  const handleToggleWishlist = async () => {
    if (isWishlistPending) return;
    // Wishlisting never requires signing in up front — same as Add to
    // Cart just above: the guest wishlist lives in localStorage and is
    // merged into the account automatically at login (see
    // WishlistContext.jsx). Only checkout is gated behind auth.
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
  };

  return (
    <section className="md:w-1/2 flex flex-col gap-6">
      {/* Name & wishlist */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-gray-900 leading-tight">{name}</h1>
        <button
          onClick={handleToggleWishlist}
          disabled={isWishlistPending}
          className={`p-2 rounded-full transition-colors shrink-0 mt-0.5 disabled:opacity-60 ${
            wishlisted
              ? 'text-red-500 bg-red-50 hover:bg-red-100'
              : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
          }`}
          aria-label={
            wishlisted
              ? t('productDetail.removeFromWishlist', 'Remove from wishlist')
              : t('productDetail.addToWishlist', 'Add to wishlist')
          }
        >
          <FiHeart className="w-5 h-5" fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Price & unit */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-bold text-primary">
          {hasValidPrice ? `₹${formattedPrice}` : t('productDetail.priceUnavailable', 'Price unavailable')}
        </span>
        {hasValidPrice && unit && (
          <span className="text-sm text-gray-500">{t('productDetail.perUnit', '/ {{unit}}', { unit })}</span>
        )}
      </div>

      {/* Delivery charge — computed against price × selected quantity, so
          it updates live as the quantity selector below changes. */}
      {hasValidPrice && <DeliveryChargeEstimate subtotal={priceValue * quantity} />}

      {/* Pincode delivery-date check — separate from the flat delivery
          charge shown above, since timing (unlike charge) genuinely
          depends on where this ships to. */}
      <PincodeServiceabilityCheck />

      {/* Stock status */}
      <StockBadge stock={stock} t={t} />

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
        <label className="text-sm font-semibold text-gray-700">{t('productDetail.quantity', 'Quantity')}</label>
        <QuantitySelector
          quantity={quantity}
          setQuantity={setQuantity}
          max={stock.quantity ?? undefined}
          disabled={!stock.available}
        />
        {hasValidPrice && (
          <p className="text-lg font-bold text-gray-800">
            {t('productDetail.subtotal', 'Subtotal')}:&nbsp;
            <span className="text-primary">₹{formattedSubtotal}</span>
          </p>
        )}
      </div>

      {/* CTA — on mobile this pins to the bottom of the viewport instead
          of sitting after the description/quantity/delivery info above,
          so it's reachable without scrolling all the way down a long
          product page. The spacer reserves room so the last bit of
          content isn't hidden behind it; both revert to the normal
          in-flow layout from md up, where the gallery+details columns
          are short enough that this isn't needed. */}
      <div className="h-20 md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-[var(--clr-border)] px-4 py-3 pb-safe md:static md:inset-auto md:z-auto md:bg-transparent md:backdrop-blur-none md:border-0 md:px-0 md:py-0">
        {stock.available ? (
          <ActionButtons
            onBuyNow={handleBuyNow}
            onAddToCart={handleAddToCart}
            isAddingToCart={isAddingToCart}
            isBuyNowPending={isBuyNowPending}
          />
        ) : (
          <button
            type="button"
            disabled
            className="btn btn-outline w-full py-3 text-sm sm:text-base opacity-60 cursor-not-allowed"
          >
            {t('productDetail.outOfStock', 'Out of Stock')}
          </button>
        )}
      </div>
    </section>
  );
}
