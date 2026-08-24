// src/components/Product/AdvikaProductCard.jsx
//
// The catalog product card used on Landing, Category, Vehicle and
// Wishlist grids — see design_handoff_advika_auto/README.md's
// "Product Card" spec. Product photography is placeholder in the design
// (a Material icon on a near-black tile); this renders a real image via
// ImageWithFallback when the product actually has one, and falls back to
// the same near-black icon-tile treatment otherwise, so the UI is
// correct today (unseeded/no-photo catalog) and upgrades automatically
// once real photography lands (see README's Roadmap #2).
import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Icon from '@/components/Shared/Icon';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { getLocalized } from '@/utils/i18nUtils';
import { getStockInfo, formatPrice } from '@/utils/productUtils';
import { buildProductPath } from '@/seo/seoUtils';
import { getVoltageInfo, getCategoryByLabel } from '@/config/advikaAuto';

// `dense` selects the Category/Vehicle listing card variant (README:
// "the category page uses a close variant" — 118/112px image, inline
// heart next to the name instead of on the image, a rating row, an
// 8.5px discount badge, and a 42px CTA at 10.5px — vs the Landing/
// related-products variant's 128px image, on-image heart, 9.5px badge
// and 44px/11px CTA).
export default function AdvikaProductCard({ product, imageHeight = 128, dense = false, fallbackIcon, codLabelKey = 'advika.cardCodAvailable', codLabelDefault = 'COD available' }) {
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);

  const lang = i18n.language || 'en';
  const name = getLocalized(product?.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product');
  const imageUrl = product?.images?.[0] || null;
  const wishlisted = isWishlisted(product.id);
  const stockInfo = getStockInfo(product);
  const voltage = getVoltageInfo(product);
  const mrp = product?.mrp;
  const hasDiscount = typeof mrp === 'number' && mrp > product.price;
  const discountPct = hasDiscount ? Math.round(((mrp - product.price) / mrp) * 100) : null;
  const icon = fallbackIcon || getCategoryByLabel(product?.category?.[0])?.icon || 'auto_awesome';

  const handleWishlist = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isWishlistPending) return;
      setIsWishlistPending(true);
      try {
        await toggleWishlist(product);
      } catch {
        // WishlistContext already surfaced a toast.
      } finally {
        setIsWishlistPending(false);
      }
    },
    [isWishlistPending, toggleWishlist, product]
  );

  const handleAddToCart = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAdding || !stockInfo.available) return;
      setIsAdding(true);
      try {
        await addItem(product, 1);
        setAdded(true);
        toast.success(t('productDetail.addedToCart', 'Added to cart!'));
        setTimeout(() => setAdded(false), 2000);
      } catch {
        // CartContext already surfaces an error toast.
      } finally {
        setIsAdding(false);
      }
    },
    [addItem, isAdding, product, stockInfo.available, t]
  );

  return (
    <article className="relative flex flex-col border border-advika-border-light bg-white" data-testid={`product-card-${product.id}`}>
      <Link to={buildProductPath(product, name)} className="absolute inset-0 z-0" aria-label={name} />

      {/* Image area */}
      <div
        className="relative flex items-center justify-center bg-advika-ink p-[14px]"
        style={{ height: imageHeight }}
      >
        <div className="absolute left-2 top-2 z-10 flex gap-1">
          {discountPct != null && (
            <span className={`aa-mono rounded-sm bg-advika-orange px-[6px] py-[3px] font-semibold text-white ${dense ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
              -{discountPct}%
            </span>
          )}
          {voltage.hasVoltage && (
            <span
              className={`aa-mono rounded-sm px-[5px] py-[3px] text-[8px] font-semibold text-white ${
                voltage.isDual ? 'bg-advika-success' : 'border border-white/[.32] bg-white/[.14]'
              }`}
            >
              {voltage.label}
            </span>
          )}
        </div>
        {/* Non-dense (Landing/related/Wishlist-style): heart overlays the
            image. Dense (Category/Vehicle): heart moves inline next to
            the name below — see README's Category card spec, "an inline
            heart (18px, #8b8681 unsaved / #f97316 saved) in a 26px target". */}
        {!dense && (
          <button
            type="button"
            onClick={handleWishlist}
            disabled={isWishlistPending}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? t('productDetail.removedFromWishlist', 'Remove from wishlist') : t('productDetail.addToWishlist', 'Add to wishlist')}
            data-testid={`product-card-wishlist-toggle-${product.id}`}
            className={`absolute right-[6px] top-[6px] z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full ${
              wishlisted ? 'bg-advika-orange/[.18]' : 'bg-white/[.12]'
            }`}
          >
            <Icon name={wishlisted ? 'favorite' : 'favorite_border'} size={19} className={wishlisted ? 'text-advika-orange' : 'text-[#d4d4d4]'} />
          </button>
        )}
        {imageUrl ? (
          <ImageWithFallback src={imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <Icon name={icon} size={46} className="text-advika-orange" />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-[9px] p-[11px] pb-[13px]">
        {dense ? (
          <div className={`flex items-start justify-between gap-2 ${typeof product.rating !== 'number' ? 'min-h-[33px]' : ''}`}>
            <h3 className="text-[12.5px] font-bold leading-[1.35] text-advika-chrome line-clamp-2">{name}</h3>
            <button
              type="button"
              onClick={handleWishlist}
              disabled={isWishlistPending}
              aria-pressed={wishlisted}
              aria-label={wishlisted ? t('productDetail.removedFromWishlist', 'Remove from wishlist') : t('productDetail.addToWishlist', 'Add to wishlist')}
              data-testid={`product-card-wishlist-toggle-${product.id}`}
              className="relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center"
            >
              <Icon name={wishlisted ? 'favorite' : 'favorite_border'} size={18} className={wishlisted ? 'text-advika-orange' : 'text-[#8b8681]'} />
            </button>
          </div>
        ) : (
          <h3 className="min-h-[36px] text-[13px] font-semibold leading-[1.35] text-advika-chrome line-clamp-2">
            {name}
          </h3>
        )}
        {dense && typeof product.rating === 'number' && (
          <span className="flex items-center gap-1">
            <Icon name="star" size={12} className="text-advika-orange" />
            <span className="text-[10.5px] font-semibold text-advika-chrome">{product.rating.toFixed(1)}</span>
            {typeof product.reviewCount === 'number' && (
              <span className="text-[9.5px] text-advika-grey650">({product.reviewCount})</span>
            )}
          </span>
        )}
        <div className="flex items-baseline gap-[6px]">
          <span className="aa-mono text-[15px] font-semibold text-advika-chrome">₹{formatPrice(product.price) ?? product.price}</span>
          {hasDiscount && <span className="aa-mono text-[10.5px] text-advika-grey650 line-through">₹{formatPrice(mrp)}</span>}
        </div>
        <span className="flex w-fit items-center gap-1 self-start rounded-sm border border-advika-success-border bg-advika-success-tint px-[6px] py-1">
          <Icon name="payments" size={12} className="text-advika-success" />
          <span className="aa-label text-[9px] font-semibold text-advika-success-dark">{t(codLabelKey, codLabelDefault)}</span>
        </span>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding || !stockInfo.available}
          data-testid={`product-card-add-to-cart-${product.id}`}
          className={`aa-label relative z-10 mt-auto flex items-center justify-center gap-2 font-bold text-white transition-colors disabled:cursor-default ${
            dense ? 'h-[42px] text-[10.5px]' : 'h-11 text-[11px]'
          } ${
            !stockInfo.available
              ? 'bg-advika-warm-white text-advika-grey700'
              : added
                ? 'bg-advika-success'
                : 'bg-advika-chrome'
          }`}
        >
          <Icon name={!stockInfo.available ? 'notifications' : added ? 'check' : 'add_shopping_cart'} size={15} />
          {!stockInfo.available
            ? t('advika.cardNotifyMe', 'NOTIFY ME')
            : added
              ? t('advika.cardAdded', 'ADDED')
              : t('advika.cardAddToCart', 'ADD TO CART')}
        </button>
      </div>
    </article>
  );
}
