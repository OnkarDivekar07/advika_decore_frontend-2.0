// src/components/Layout/StickyBar.jsx
//
// Bottom bars — see design_handoff_advika_auto/README.md, Landing
// section 12 (CALL / WHATSAPP / VIEW CART) and the Product/Cart per-page
// variants (a summary line beside one primary action).
import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { useCart } from '@/contexts/CartContext';
import { useBrandPhone } from '@/hooks/useBrandPhone';

// Not `position: fixed` — renders in normal document flow, right after
// AdvikaFooter (see HomePage.jsx), so it sits at the very bottom of the
// page instead of pinned over the content while scrolling.
export function LandingStickyBar() {
  const { t } = useTranslation();
  const { itemCount } = useCart();
  const { tel, whatsapp } = useBrandPhone();

  return (
    <div className="mx-auto grid max-w-shell grid-cols-[1fr_1fr_1.4fr] border-t border-[#333] bg-advika-chrome">
      <a href={tel} className="flex h-[66px] flex-col items-center justify-center gap-1 border-r border-[#333]">
        <Icon name="call" size={22} className="text-advika-orange" />
        <span className="aa-mono text-[9.5px] text-[#e5e5e5]">{t('advika.landing.callLabel', 'CALL')}</span>
      </a>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-[66px] flex-col items-center justify-center gap-1 border-r border-[#333]"
      >
        <Icon name="chat" size={22} className="text-advika-whatsapp-bright" />
        <span className="aa-mono text-[9.5px] text-[#e5e5e5]">{t('advika.landing.whatsappLabel', 'WHATSAPP')}</span>
      </a>
      <a href="/cart" className="flex h-[66px] flex-col items-center justify-center gap-1 bg-advika-orange">
        <Icon name="shopping_cart" size={20} className="text-white" />
        <span className="aa-label text-[13.5px] font-bold text-white">
          {t('advika.landing.viewCart', 'VIEW CART')}
          {itemCount > 0 ? ` (${itemCount})` : ''}
        </span>
      </a>
    </div>
  );
}

// Generic "label / mono price" + one primary CTA bar, used by Cart.
// `children` renders the button itself so the caller keeps full control
// of its own state/label.
export function StickyActionBar({ eyebrow, value, children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-w-shell items-center gap-3 border-t border-[#333] bg-advika-chrome px-[14px] py-[11px]">
      {(eyebrow || value) && (
        <div className="flex flex-col">
          {eyebrow && <span className="aa-label text-[9px] text-advika-grey600">{eyebrow}</span>}
          {value && <span className="aa-mono text-[19px] font-semibold text-white">{value}</span>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Product Detail's own two-row sticky bar — price/meta + a quantity
// stepper on one row, an outlined Add to Cart and a filled Buy Now
// button on the next. Distinct from StickyActionBar (which Cart also
// uses and which only ever needed one row/one button) because Product
// Detail's design specifically calls for the qty stepper and the second
// CTA that Cart's bar doesn't have.
//
// `visible` mirrors the design's own showBar behavior: hidden (slid down
// off-screen via transform, not unmounted, so the slide can animate)
// until the caller's inline Add to Cart/Buy Now section has scrolled
// fully past — see ProductDetailPage's scroll listener on `buyRef`. The
// design deliberately never shows both the inline buttons and this bar
// on screen at once.
export function ProductStickyBar({
  visible = true,
  metaLabel,
  price,
  mrp,
  quantity,
  onDecrease,
  onIncrease,
  canIncrease = true,
  onAddToCart,
  addToCartDisabled = false,
  added = false,
  addToCartLabel,
  addToCartIcon = 'add_shopping_cart',
  onBuyNow,
  buyNowLabel,
  buyNowDisabled = false,
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-w-shell flex-col gap-[9px] border-t border-[#333] bg-advika-chrome px-[14px] pb-safe pt-[10px] shadow-[0_-8px_24px_rgba(0,0,0,.28)] transition-transform duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(115%)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[2px]">
          {metaLabel && <span className="aa-label text-[9px] text-advika-grey600">{metaLabel}</span>}
          <div className="flex items-baseline gap-[6px]">
            <span className="aa-mono text-[19px] font-semibold text-white">{price}</span>
            {mrp && <span className="aa-mono text-[11px] text-advika-grey700 line-through">{mrp}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center overflow-hidden rounded-[3px] border border-advika-border-dark4">
          <button type="button" onClick={onDecrease} aria-label={t('cart.decreaseQuantity', 'Decrease quantity')} className="flex h-10 w-10 items-center justify-center border-r border-[#333]">
            <Icon name="remove" size={17} className="text-[#e5e5e5]" />
          </button>
          <span className="aa-mono flex h-10 min-w-[42px] items-center justify-center text-[15px] font-semibold text-white">{quantity}</span>
          <button type="button" onClick={onIncrease} disabled={!canIncrease} aria-label={t('cart.increaseQuantity', 'Increase quantity')} className="flex h-10 w-10 items-center justify-center border-l border-[#333] disabled:opacity-40">
            <Icon name="add" size={17} className="text-[#e5e5e5]" />
          </button>
        </div>
      </div>
      <div className="flex gap-[9px]">
        <button
          type="button"
          onClick={onAddToCart}
          disabled={addToCartDisabled}
          data-testid="product-detail-sticky-add-to-cart-button"
          className={`aa-label flex h-12 flex-1 items-center justify-center gap-[7px] rounded bg-transparent text-[12.5px] font-bold disabled:opacity-60 ${
            added ? 'border-[1.5px] border-advika-success text-advika-success-bright' : 'border-[1.5px] border-advika-orange text-advika-orange'
          }`}
        >
          <Icon name={addToCartIcon} size={17} />
          {addToCartLabel}
        </button>
        <button
          type="button"
          onClick={onBuyNow}
          disabled={buyNowDisabled}
          data-testid="product-detail-sticky-buy-now-button"
          className="aa-label flex h-12 flex-1 items-center justify-center rounded bg-advika-orange text-[12.5px] font-bold text-white disabled:opacity-60"
        >
          {buyNowLabel}
        </button>
      </div>
    </div>
  );
}
