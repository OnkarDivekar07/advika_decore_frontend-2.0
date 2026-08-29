// src/pages/Cart/CartPage.jsx — Advika Auto Cart
// See design_handoff_advika_auto/README.md, screen 5 "Cart". Deliberately
// no coupon field (see README) even though CartContext supports one.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import SlideMenu from '@/components/Layout/SlideMenu';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import PromiseStrip from '@/components/Shared/PromiseStrip';
import { StickyActionBar } from '@/components/Layout/StickyBar';
import { useCart } from '@/contexts/CartContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { fetchProducts } from '@/services/productsService';
import { getStockInfo, formatPrice } from '@/utils/productUtils';
import { getLocalized as getLocalizedI18n } from '@/utils/i18nUtils';
import { getCategoryByLabel, getVoltageInfo } from '@/config/advikaAuto';
import { useBrandPhone } from '@/hooks/useBrandPhone';
import { buildProductPath } from '@/seo/seoUtils';

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { requireAuth } = useAuthGate();
  const { tel: BRAND_PHONE_TEL } = useBrandPhone();
  const {
    items: cartItems,
    subtotal,
    total,
    addItem,
    updateQuantity,
    removeItem,
    isSyncing,
    loadError,
    retryLoadCart,
  } = useCart();
  const [isRetrying, setIsRetrying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alsoBought, setAlsoBought] = useState([]);
  const [addingIds, setAddingIds] = useState(() => new Set());

  const handleAddAlsoBought = useCallback(async (product) => {
    if (addingIds.has(product.id)) return;
    setAddingIds((prev) => new Set(prev).add(product.id));
    try {
      await addItem(product, 1);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  }, [addItem, addingIds]);

  const mrpTotal = cartItems.reduce((acc, item) => acc + (item.mrp ?? item.price) * item.quantity, 0);
  const savings = Math.max(0, mrpTotal - subtotal);
  const hasUnavailableItem = cartItems.some((item) => {
    const stock = getStockInfo({ stock: item.stock });
    return stock.quantity !== null && item.quantity > stock.quantity;
  });

  useEffect(() => {
    if (cartItems.length === 0) return;
    let cancelled = false;
    fetchProducts({ limit: 4 })
      .then(({ items }) => {
        if (cancelled) return;
        const cartIds = new Set(cartItems.map((i) => i.id));
        setAlsoBought(items.filter((p) => !cartIds.has(p.id)).slice(0, 2));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // Deliberately keyed on cartItems.length only — re-running this for
    // every quantity-only change (a new array reference on each tick)
    // would refetch "also bought" suggestions far more than needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await retryLoadCart();
    } finally {
      setIsRetrying(false);
    }
  }, [retryLoadCart]);

  if (isSyncing) {
    return (
      <div className="aa-shell flex min-h-screen items-center justify-center bg-white">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="aa-shell aa-page-cart min-h-screen bg-advika-warm-white pb-[92px]">
      <Seo title={t('cart.title', 'Your Cart')} noindex />
      <AdvikaHeader variant="hamburger" menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="main-content" tabIndex={-1}>
        {loadError ? (
          <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
            <Icon name="error" size={40} className="text-advika-grey650" />
            <p className="text-advika-grey800">{t('cart.loadError', "We couldn't load your cart.")}</p>
            <button type="button" data-testid="cart-retry-button" onClick={handleRetry} disabled={isRetrying} className="h-11 bg-advika-chrome px-6 text-[13px] font-bold text-white disabled:opacity-60">
              {isRetrying ? t('cart.retrying', 'Retrying…') : t('buttons.retry', 'Retry')}
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          <div data-testid="cart-empty-state" className="flex flex-col items-center gap-4 px-6 pb-[60px] pt-[52px] text-center">
            <span className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#e9e7e3]">
              <Icon name="remove_shopping_cart" size={40} className="text-advika-grey600" />
            </span>
            <h1 className="font-archivoBlack text-[21px] leading-[1.2] text-advika-chrome">{t('advika.cartPage.emptyTitle')}</h1>
            <p className="max-w-[280px] text-[13.5px] text-advika-grey800">{t('advika.cartPage.emptyBody')}</p>
            <Link to="/products" className="aa-tracking mt-[6px] flex h-[54px] items-center justify-center gap-[9px] rounded bg-advika-orange px-[26px] text-[14px] font-bold text-white">
              {t('advika.cartPage.startShopping')} <span>→</span>
            </Link>
            <a href={BRAND_PHONE_TEL} className="mt-[2px] flex items-center gap-[7px] text-[13px] text-advika-grey800">
              <Icon name="chat" size={16} className="text-advika-grey800" /> {t('advika.cartPage.emptyHelp')}
            </a>
          </div>
        ) : (
          <>
            {/* Title block */}
            <div className="flex flex-col gap-[9px] bg-advika-near-black px-4 pb-6 pt-[26px]">
              <Link to="/products" className="aa-label flex items-center gap-[6px] text-[10.5px] text-advika-grey600">
                <Icon name="arrow_back" size={15} /> {t('advika.cartPage.backToShop', 'BACK TO SHOP')}
              </Link>
              <h1 className="aa-title-xl text-white">
                {t('advika.cartPage.titleLine1', 'SHOPPING')} <span className="text-advika-orange">{t('advika.cartPage.titleAccent', 'CART')}</span>
              </h1>
              <p className="aa-label text-[11.5px] text-advika-grey600">
                {t('advika.cartPage.itemsSummary', { count: cartItems.reduce((a, i) => a + i.quantity, 0), total: formatPrice(total) ?? total })}
              </p>
            </div>

            {/* Line items */}
            <div className="flex flex-col gap-3 px-[14px] pt-4">
              {cartItems.map((item) => {
                const category = getCategoryByLabel(item.category?.[0]);
                const lineTotal = item.price * item.quantity;
                const lineMrp = item.mrp ? item.mrp * item.quantity : null;
                const discountPct =
                  typeof item.mrp === 'number' && item.mrp > item.price
                    ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
                    : null;
                const voltage = getVoltageInfo(item);
                // Domain rule table (README's "Domain rule: 12V vs 24V"):
                // "Cart line items — Voltage takes a slot in the
                // spec-chip row, replacing a lower-value spec like
                // 'Combo Beam'." — voltage leads when present.
                const specChips = [
                  voltage.hasVoltage ? voltage.label : null,
                  item.specs?.Wattage,
                  item.specs?.['Beam Pattern'],
                ].filter(Boolean);
                return (
                  <div key={item.id} data-testid={`cart-item-${item.id}`} className="flex gap-3 rounded border border-advika-border-light bg-white p-[13px]">
                    <Link to={buildProductPath({ id: item.id }, item.name)} className="relative flex h-[78px] w-[78px] shrink-0 items-center justify-center rounded-[3px] bg-[#151515]">
                      {discountPct != null && (
                        <span className="aa-mono absolute left-[5px] top-[5px] z-10 rounded-sm bg-advika-orange px-[4px] py-[2px] text-[8px] font-semibold text-white">
                          -{discountPct}%
                        </span>
                      )}
                      {item.image ? (
                        <ImageWithFallback src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Icon name={category?.icon || 'auto_awesome'} size={34} className="text-advika-orange" />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col gap-1">
                          {category && (
                            <div className="aa-label text-[9px] font-semibold text-advika-orange-dark">{t(`advika.category.${category.id}`, category.label)}</div>
                          )}
                          <Link to={buildProductPath({ id: item.id }, item.name)} className="text-[14px] font-bold leading-[1.3] text-advika-chrome">
                            {getLocalizedI18n(item.name, i18n.language)}
                          </Link>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} aria-label={t('cart.remove', 'Remove')} data-testid={`cart-item-remove-${item.id}`} className="flex h-8 w-8 shrink-0 items-center justify-center">
                          <Icon name="delete_outline" size={18} className="text-advika-grey600" />
                        </button>
                      </div>
                      {specChips.length > 0 && (
                        <div className="flex flex-wrap gap-[5px]">
                          {specChips.map((chip) => (
                            <span key={chip} className="aa-label rounded-sm border border-advika-border-light bg-advika-off-white px-[7px] py-[4px] text-[9.5px] text-advika-grey800">
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-[2px]">
                        <div className="flex h-9 overflow-hidden rounded-[3px] border border-advika-grey400">
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={t('cart.decreaseQuantity', 'Decrease quantity')} data-testid={`cart-item-decrease-${item.id}`} className="flex w-9 items-center justify-center border-r border-advika-border-light">
                            <Icon name="remove" size={17} className="text-advika-grey900" />
                          </button>
                          <span className="aa-mono flex min-w-[38px] items-center justify-center text-[14px] font-semibold" data-testid={`cart-item-quantity-${item.id}`}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={t('cart.increaseQuantity', 'Increase quantity')} data-testid={`cart-item-increase-${item.id}`} className="flex w-9 items-center justify-center border-l border-advika-border-light">
                            <Icon name="add" size={17} className="text-advika-grey900" />
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="aa-mono text-[16px] font-semibold text-advika-chrome">₹{formatPrice(lineTotal) ?? lineTotal}</div>
                          {lineMrp && lineMrp > lineTotal && <div className="aa-mono text-[10.5px] text-advika-grey600 line-through">₹{formatPrice(lineMrp)}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-[14px] pt-4">
              <PromiseStrip
                items={[
                  { icon: 'payments', title: t('advika.promise.cod', 'Cash on Delivery'), body: t('advika.cartPage.promiseCodBody', 'Pay when it arrives') },
                  { icon: 'local_shipping', title: t('advika.cartPage.promiseShipping', 'Fast Shipping'), body: t('advika.cartPage.promiseShippingBody', '3-4 days, free') },
                  { icon: 'receipt_long', title: t('advika.promise.gst', 'GST Bill'), body: t('advika.cartPage.promiseGstBody', 'Genuine parts') },
                ]}
              />
            </div>

            {/* Order summary */}
            <div className="mx-[14px] mt-4 flex flex-col gap-[15px] rounded border border-advika-border-light bg-white p-4">
              <h2 className="font-archivoBlack text-[18px] text-advika-chrome">{t('advika.cartPage.summary', 'Order Summary')}</h2>
              <div className="flex flex-col gap-[11px]">
                <div className="flex items-baseline justify-between text-[13px] text-advika-grey800">
                  <span>{t('advika.cartPage.mrpTotal')}</span>
                  <span className="aa-mono text-[13.5px] text-advika-grey900">₹{formatPrice(mrpTotal) ?? mrpTotal}</span>
                </div>
                {savings > 0 && (
                  <div className="flex items-baseline justify-between text-[13px] font-semibold text-advika-success">
                    <span>{t('advika.cartPage.productDiscount')}</span>
                    <span className="aa-mono text-[13.5px]">−₹{formatPrice(savings)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between text-[13px] text-advika-grey800">
                  <span>{t('advika.cartPage.shipping')}</span>
                  <span className="aa-mono text-[12px] font-semibold text-advika-success">{t('advika.cartPage.free', 'FREE')}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between border-t border-advika-border-light pt-3">
                <span className="text-[16px] font-bold text-advika-chrome">{t('advika.cartPage.total', 'Total')}</span>
                <span className="aa-mono text-[20px] font-semibold text-advika-chrome">₹{formatPrice(total) ?? total}</span>
              </div>
              {hasUnavailableItem && (
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-advika-danger">
                  <Icon name="error" size={14} />
                  {t('cart.resolveBeforeCheckout', 'Remove or update the out-of-stock items in your cart to continue.')}
                </p>
              )}
              <Link to="/products" className="flex items-center justify-center gap-[7px] text-center text-[13px] text-advika-grey800">
                <Icon name="arrow_back" size={16} />
                {t('advika.cartPage.continueShopping')}
              </Link>
            </div>

            {/* Savings band */}
            {savings > 0 && (
              <div className="px-[14px] pt-4">
                <div className="flex items-center gap-[14px] rounded bg-advika-near-black p-[18px]">
                  <Icon name="savings" size={30} className="text-advika-orange" />
                  <div>
                    <div className="aa-label text-[9.5px] text-advika-orange">{t('advika.cartPage.savings')}</div>
                    <div className="font-archivoBlack text-[26px] leading-none text-white">₹{formatPrice(savings)}</div>
                    <div className="text-[11.5px] text-advika-grey600">{t('advika.cartPage.onThisOrder')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Also bought */}
            {alsoBought.length > 0 && (
              <div className="flex flex-col gap-3 px-4 pb-7 pt-[22px]">
                <h2 className="font-archivoBlack text-[17px] text-advika-chrome">{t('advika.cartPage.alsoBought')}</h2>
                <div className="grid grid-cols-2 gap-[11px]">
                  {alsoBought.map((p) => {
                    const category = getCategoryByLabel(p.category?.[0]);
                    return (
                      <div key={p.id} className="flex flex-col overflow-hidden rounded border border-advika-border-light bg-white">
                        <Link to={buildProductPath(p, getLocalizedI18n(p.name, i18n.language))} className="flex h-24 items-center justify-center bg-[#151515]">
                          {p.images?.[0] ? (
                            <ImageWithFallback src={p.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Icon name={category?.icon || 'auto_awesome'} size={36} className="text-advika-orange" />
                          )}
                        </Link>
                        <div className="flex flex-col gap-2 p-[11px]">
                          <span className="min-h-[33px] text-[12.5px] font-semibold leading-[1.3] text-advika-chrome">{getLocalizedI18n(p.name, i18n.language)}</span>
                          <span className="aa-mono text-[14px] font-semibold text-advika-chrome">₹{formatPrice(p.price) ?? p.price}</span>
                          <button
                            type="button"
                            onClick={() => handleAddAlsoBought(p)}
                            disabled={addingIds.has(p.id)}
                            className="aa-tracking flex h-[38px] items-center justify-center gap-[5px] rounded-[3px] border-[1.5px] border-advika-chrome text-[10.5px] font-bold text-advika-chrome disabled:opacity-60"
                          >
                            <Icon name="add" size={14} className="text-advika-chrome" />
                            {t('advika.cartPage.add', 'ADD')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <AdvikaFooter />
          </>
        )}
      </main>

      {cartItems.length > 0 && (
        <StickyActionBar eyebrow={t('checkout.total', 'Total')} value={`₹${formatPrice(total) ?? total}`}>
          <button
            type="button"
            onClick={() => requireAuth(() => navigate('/checkout'))}
            disabled={hasUnavailableItem}
            data-testid="cart-sticky-proceed-to-checkout-button"
            className="aa-tracking flex h-[52px] w-full items-center justify-center gap-2 rounded bg-advika-orange text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            {t('advika.cartPage.proceed', 'PROCEED TO CHECKOUT')} <span>→</span>
          </button>
        </StickyActionBar>
      )}
    </div>
  );
}
