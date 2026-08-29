// src/components/Product/AdvikaProductCard.jsx
//
// The catalog product card used on Landing, Category, Vehicle, Wishlist
// and Product Detail's "You may also like" grids — see
// design_handoff_advika_auto/README.md's "Product Card" spec. Product
// photography is placeholder in the design (a Material icon on a
// near-black tile); this renders a real image via ImageWithFallback when
// the product actually has one, and falls back to the same near-black
// icon-tile treatment otherwise, so the UI is correct today
// (unseeded/no-photo catalog) and upgrades automatically once real
// photography lands (see README's Roadmap #2).
//
// Three variants, controlled by `dense`/`compact` (mutually exclusive —
// `compact` wins if both are somehow passed):
// - default (Landing/related-in-other-contexts): 128px image, on-image
//   heart, 9.5px badge, 44px/11px CTA with icon, dynamic CTA color.
// - dense (Category/Vehicle): inline heart next to the name, a rating
//   row, 8.5px badge, 42px/10.5px CTA with icon, dynamic CTA color.
// - compact (Product Detail's "You may also like"): like dense but with
//   a category-eyebrow row, a smaller 8px badge, no wishlist heart at
//   all, no COD chip, an extra 9.5px "-23%" style off-text next to the
//   price, and a 38px CTA with NO icon that's always orange (never
//   flips to a success-green "added" state).
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

export default function AdvikaProductCard({
  product,
  imageHeight = 128,
  dense = false,
  compact = false,
  fallbackIcon,
  fallbackIconSize = 46,
  codLabelKey = 'advika.cardCodAvailable',
  codLabelDefault = 'COD available',
}) {
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
  const category = getCategoryByLabel(product?.category?.[0]);
  const mrp = product?.mrp;
  const hasDiscount = typeof mrp === 'number' && mrp > product.price;
  const discountPct = hasDiscount ? Math.round(((mrp - product.price) / mrp) * 100) : null;
  const icon = fallbackIcon || category?.icon || 'auto_awesome';

  // `compact` reuses dense's tighter card chrome (rounded corners, inline
  // heart slot, rating row) but overrides several of its own values below.
  const isCompactOrDense = compact || dense;

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
    <article className={`relative flex flex-col border border-advika-border-light bg-white ${isCompactOrDense ? 'overflow-hidden rounded' : ''}`} data-testid={`product-card-${product.id}`}>
      <Link to={buildProductPath(product, name)} className="absolute inset-0 z-0" aria-label={name} />

      {/* Image area. pointer-events-none on this whole wrapper — it's a
          `relative`-positioned sibling that comes after the card-covering
          Link in the DOM, so without this it painted (and hit-tested)
          above the Link and ate every click on the product photo itself,
          the single largest and most-clicked part of the card. The
          wishlist button below opts back into pointer-events-auto since
          it's a real control, not decoration. */}
      <div
        className={`pointer-events-none relative flex items-center justify-center p-[14px] ${isCompactOrDense ? 'bg-[#0a0a0a]' : 'bg-[#151515]'}`}
        style={{ height: imageHeight }}
      >
        <div className={`absolute z-10 flex gap-1 ${isCompactOrDense ? 'left-[7px] top-[7px]' : 'left-2 top-2'}`}>
          {discountPct != null && (
            <span className={`aa-mono rounded-sm bg-advika-orange py-[3px] font-semibold text-white ${compact ? 'px-[5px] text-[8px]' : dense ? 'px-[5px] text-[8.5px]' : 'px-[6px] text-[9.5px]'}`}>
              -{discountPct}%
            </span>
          )}
          {voltage.hasVoltage && (
            <span
              className={`aa-mono rounded-sm py-[3px] font-semibold text-white ${compact ? 'px-[5px] text-[8px]' : dense ? 'px-[5px] text-[8.5px]' : 'px-[6px] text-[9.5px]'} ${
                voltage.isDual ? 'bg-advika-success' : 'border border-white/[.32] bg-white/[.14]'
              }`}
            >
              {voltage.label}
            </span>
          )}
        </div>
        {/* Default (Landing/Wishlist-style): heart overlays the image.
            Dense (Category/Vehicle): heart moves inline next to the name
            below — see README's Category card spec, "an inline heart
            (18px, #8b8681 unsaved / #f97316 saved) in a 26px target".
            Compact (Product Detail's related grid) has no heart at all. */}
        {!isCompactOrDense && (
          <button
            type="button"
            onClick={handleWishlist}
            disabled={isWishlistPending}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? t('productDetail.removedFromWishlist', 'Remove from wishlist') : t('productDetail.addToWishlist', 'Add to wishlist')}
            data-testid={`product-card-wishlist-toggle-${product.id}`}
            className={`pointer-events-auto absolute right-[6px] top-[6px] z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full ${
              wishlisted ? 'bg-advika-orange/[.18]' : 'bg-white/[.12]'
            }`}
          >
            <Icon name={wishlisted ? 'favorite' : 'favorite_border'} size={19} className={wishlisted ? 'text-advika-orange' : 'text-[#d4d4d4]'} />
          </button>
        )}
        {imageUrl ? (
          <ImageWithFallback src={imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <Icon name={icon} size={fallbackIconSize} className="text-advika-orange" />
        )}
      </div>

      {/* Body */}
      <div className={`flex flex-1 flex-col px-[11px] ${compact ? 'gap-[7px] py-[11px]' : dense ? 'gap-[8px] py-[11px]' : 'gap-[9px] pt-3 pb-[13px]'}`}>
        {compact && category && (
          <span className="aa-label text-[8.5px] font-semibold text-advika-orange-dark">
            {t(`advika.category.${category.id}`)}
          </span>
        )}
        {dense ? (
          <div className={`flex items-start justify-between gap-2 ${typeof product.rating !== 'number' ? 'min-h-[33px]' : ''}`}>
            <h3 className="text-[12.5px] font-bold leading-[1.3] text-advika-chrome line-clamp-2">{name}</h3>
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
        ) : compact ? (
          <Link
            to={buildProductPath(product, name)}
            className="relative z-10 min-h-[33px] text-[12.5px] font-bold leading-[1.3] text-advika-chrome line-clamp-2"
          >
            {name}
          </Link>
        ) : (
          <h3 className="min-h-[36px] text-[13px] font-semibold leading-[1.35] text-advika-chrome line-clamp-2">
            {name}
          </h3>
        )}
        {isCompactOrDense && typeof product.rating === 'number' && (
          <span className="flex items-center gap-[5px]">
            <Icon name="star" size={12} className="text-advika-orange" />
            <span className="aa-mono text-[10.5px] font-semibold text-advika-chrome">{product.rating.toFixed(1)}</span>
            {typeof product.reviewCount === 'number' && (
              <span className="aa-mono text-[9.5px] text-advika-grey600">({product.reviewCount})</span>
            )}
          </span>
        )}
        <div className="flex flex-wrap items-baseline gap-[6px]">
          <span className={`aa-mono font-semibold text-advika-chrome ${compact ? 'text-[14px]' : dense ? 'text-[14.5px]' : 'text-[15px]'}`}>₹{formatPrice(product.price) ?? product.price}</span>
          {hasDiscount && <span className={`aa-mono text-advika-grey600 line-through ${compact ? 'text-[10px]' : dense ? 'text-[10px]' : 'text-[10.5px]'}`}>₹{formatPrice(mrp)}</span>}
          {compact && discountPct != null && (
            <span className="text-[9.5px] font-bold text-advika-success">-{discountPct}%</span>
          )}
        </div>
        {!compact && (
          <span className="flex w-fit items-center gap-1 self-start rounded-sm border border-advika-success-border bg-advika-success-tint px-[6px] py-1">
            <Icon name="payments" size={dense ? 11 : 12} className="text-advika-success" />
            <span className={`aa-mono font-semibold text-advika-success-dark ${dense ? 'text-[8.5px]' : 'text-[9px]'}`}>{t(codLabelKey, codLabelDefault)}</span>
          </span>
        )}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding || !stockInfo.available}
          data-testid={`product-card-add-to-cart-${product.id}`}
          className={`relative z-10 mt-auto flex items-center justify-center font-bold text-white transition-colors disabled:cursor-default ${
            compact
              ? 'aa-tracking h-[38px] rounded-[3px] text-[10.5px]'
              : dense
                ? 'aa-label h-[42px] rounded-[3px] gap-[6px] text-[10.5px]'
                : 'aa-label h-11 gap-[6px] text-[11px]'
          } ${
            compact
              ? 'bg-advika-orange'
              : !stockInfo.available
                ? 'bg-advika-warm-white text-advika-grey700'
                : added
                  ? 'bg-advika-success'
                  : 'bg-advika-chrome'
          }`}
        >
          {!compact && <Icon name={!stockInfo.available ? 'notifications' : added ? 'check' : 'add_shopping_cart'} size={15} />}
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
