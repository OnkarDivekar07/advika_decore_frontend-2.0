// src/pages/ProductDetail/ProductDetailPage.jsx — Advika Auto Product detail
// See design_handoff_advika_auto/README.md, screen 4 "Product detail" and
// the "Domain rule: 12V vs 24V" section for the fitment block. Variant
// pickers, specs and vehicle-compatibility all read from optional product
// fields (product.variants/specs/compatibility/rating) that don't exist
// on the backend's Product model yet — every such section renders nothing
// rather than fake data when the field is absent, and lights up
// automatically once the backend task adds them.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import PromiseStrip from '@/components/Shared/PromiseStrip';
import AdvikaProductCard from '@/components/Product/AdvikaProductCard';
import { StickyActionBar } from '@/components/Layout/StickyBar';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { getProductById, getRelatedProducts } from '@/services/productsService';
import { useServiceabilityCheck } from '@/features/shipping/hooks/useServiceabilityCheck';
import { handleError } from '@/utils/errorHandler';
import { getLocalized } from '@/utils/i18nUtils';
import { getStockInfo, formatPrice } from '@/utils/productUtils';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { sanitizePincodeInput, PINCODE_REGEX } from '@/utils/pincodeValidation';
import { buildProductPath, htmlToMetaDescription, buildAbsoluteUrl } from '@/seo/seoUtils';
import { buildProductJsonLd } from '@/seo/structuredData';
import { getVoltageInfo, getCategoryByLabel, getVehicleIcon, BRAND_PHONE_TEL } from '@/config/advikaAuto';

const TABS = ['description', 'specifications', 'reviews'];

export default function ProductDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || 'en';
  const { addItem, setBuyNow } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { requireAuth } = useAuthGate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [related, setRelated] = useState([]);

  const [variantIndex, setVariantIndex] = useState({}); // { [groupLabel]: optionIndex }
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('specifications');
  const [added, setAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyNowPending, setIsBuyNowPending] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [pincode, setPincode] = useState('');
  const { status: pincodeStatus, data: pincodeData, retry: retryPincode } = useServiceabilityCheck(pincode, { debounceMs: 0, enabled: PINCODE_REGEX.test(pincode) });

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getProductById(id);
      setProduct(data);
      setVariantIndex({});
      setSelectedImage(0);
      setQuantity(1);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      else {
        handleError(err);
        setError(t('productDetail.errorLoadingProduct', 'Failed to load product. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    getRelatedProducts(id)
      .then((res) => { if (!cancelled) setRelated(Array.isArray(res) ? res : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const name = product ? getLocalized(product.name, lang) || t('productDetail.unnamedProduct', 'Unnamed product') : '';
  const stockInfo = useMemo(() => (product ? getStockInfo(product) : { available: true }), [product]);
  // Caps the stepper at real remaining stock when the backend gives us a
  // count; falls back to a flat ceiling for the (currently common) case
  // where a product only exposes a boolean inStock flag with no count.
  const maxSelectableQuantity = typeof stockInfo.quantity === 'number' ? Math.max(1, stockInfo.quantity) : 9;
  const voltage = useMemo(() => (product ? getVoltageInfo(product) : { hasVoltage: false }), [product]);
  const category = getCategoryByLabel(product?.category?.[0]);

  // Variant groups: optional product.variants = [{ label, options: [{ label, price, mrp }] }].
  // Absent for every product until the backend adds it — the whole
  // section (and the sticky bar's live price) then just falls back to
  // product.price/mrp below.
  const variantGroups = Array.isArray(product?.variants) ? product.variants : [];
  const activeVariantPrice = variantGroups.reduce((acc, group) => {
    const idx = variantIndex[group.label] ?? group.defaultIndex ?? 0;
    const opt = group.options?.[idx];
    return opt?.price != null ? opt.price : acc;
  }, product?.price);
  const activeVariantMrp = variantGroups.reduce((acc, group) => {
    const idx = variantIndex[group.label] ?? group.defaultIndex ?? 0;
    const opt = group.options?.[idx];
    return opt?.mrp != null ? opt.mrp : acc;
  }, product?.mrp);

  const hasDiscount = typeof activeVariantMrp === 'number' && activeVariantMrp > activeVariantPrice;
  const discountPct = hasDiscount ? Math.round(((activeVariantMrp - activeVariantPrice) / activeVariantMrp) * 100) : null;

  const seoData = useMemo(() => {
    if (!product) return null;
    const rawDescription = getLocalized(product.description, lang);
    const metaDescription = htmlToMetaDescription(sanitizeHtml(rawDescription));
    return {
      canonicalPath: buildProductPath(product, name),
      jsonLd: [buildProductJsonLd({
        name, description: metaDescription, images: product.images ?? [], sku: product.id,
        price: Number(product.price), stock: stockInfo, url: buildAbsoluteUrl(buildProductPath(product, name)),
        category: product.category?.[0],
      })],
    };
  }, [product, lang, name, stockInfo]);

  const wishlisted = product ? isWishlisted(product.id) : false;

  const handleWishlist = useCallback(async () => {
    if (isWishlistPending || !product) return;
    setIsWishlistPending(true);
    try {
      await toggleWishlist(product);
    } catch {
      // toast already surfaced by WishlistContext
    } finally {
      setIsWishlistPending(false);
    }
  }, [isWishlistPending, product, toggleWishlist]);

  const handleAddToCart = useCallback(async () => {
    if (!product || !stockInfo.available || isAdding) return;
    setIsAdding(true);
    try {
      await addItem({ ...product, price: activeVariantPrice }, quantity);
      setAdded(true);
      toast.success(t('productDetail.addedToCart', 'Added to cart!'));
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // toast already surfaced by CartContext
    } finally {
      setIsAdding(false);
    }
  }, [product, stockInfo.available, isAdding, addItem, activeVariantPrice, quantity, t]);

  const handleBuyNow = useCallback(() => {
    if (!product || !stockInfo.available || isBuyNowPending) return;
    setIsBuyNowPending(true);
    try {
      const ok = setBuyNow({ ...product, price: activeVariantPrice }, quantity);
      if (!ok) {
        toast.error(t('productDetail.buyNowFailed', "Couldn't start checkout. Please try again."));
        return;
      }
      requireAuth(() => navigate('/checkout?mode=buyNow'));
    } finally {
      setIsBuyNowPending(false);
    }
  }, [product, stockInfo.available, isBuyNowPending, setBuyNow, activeVariantPrice, quantity, t, requireAuth, navigate]);

  if (loading) {
    return (
      <div className="aa-shell flex min-h-screen items-center justify-center bg-white">
        <Spinner size={48} />
      </div>
    );
  }

  if (notFound || error || !product) {
    return (
      <div className="aa-shell min-h-screen bg-white">
        <AdvikaHeader />
        <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
          <Icon name="error" size={40} className="text-advika-grey650" />
          <p className="text-advika-grey800">
            {notFound ? t('productDetail.notFound', 'This product is no longer available.') : error}
          </p>
          <button
            type="button"
            onClick={() => (notFound ? navigate('/products') : fetchProduct())}
            data-testid="product-detail-retry-button"
            className="h-11 border-[1.5px] border-advika-chrome px-6 text-[13px] font-bold"
          >
            {notFound ? t('productDetail.browseProducts', 'Browse products') : t('productDetail.retry', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const specs = product.specs && typeof product.specs === 'object' ? Object.entries(product.specs) : [];
  const compatibility = product.compatibility && typeof product.compatibility === 'object' ? product.compatibility : null; // { '24V': ['Tata Signa', ...], '12V': [...] }
  const variantMetaLabel = variantGroups.map((g) => g.options?.[variantIndex[g.label] ?? g.defaultIndex ?? 0]?.label).filter(Boolean).join(' · ');
  // The gallery's main-frame badge shows only the selected wattage
  // (README: "A wattage badge sits top:10px;left:10px"), not the full
  // "100W · Combo" meta line the sticky bar uses.
  const wattageGroup = variantGroups.find((g) => g.label === 'Wattage');
  const selectedWatt = wattageGroup
    ? wattageGroup.options?.[variantIndex[wattageGroup.label] ?? wattageGroup.defaultIndex ?? 0]?.label
    : null;

  return (
    <div className="aa-shell min-h-screen bg-white pb-[92px]">
      {seoData && <Seo title={name} canonicalPath={seoData.canonicalPath} jsonLd={seoData.jsonLd} image={images[0]} ogType="product" />}
      <AdvikaHeader />

      {/* Breadcrumb */}
      <div className="flex items-center gap-[7px] overflow-hidden border-b border-advika-border-light px-[14px] py-[11px] text-[11.5px]">
        <Link to="/" className="shrink-0 text-advika-grey700">{t('common.home', 'Home')}</Link>
        <span className="text-advika-grey700">›</span>
        {category && (
          <>
            <Link to={`/products?category=${encodeURIComponent(category.label)}`} className="shrink-0 text-advika-grey700">
              {t(`advika.category.${category.id}`)}
            </Link>
            <span className="text-advika-grey700">›</span>
          </>
        )}
        <span className="truncate font-semibold text-advika-orange-dark">{name}</span>
      </div>

      <main id="main-content" tabIndex={-1}>
        {/* Gallery */}
        <div className="flex flex-col gap-[10px] px-[14px] pt-[14px]">
          <div className="relative flex h-[230px] items-center justify-center rounded-[5px] bg-advika-ink">
            {selectedWatt && (
              <span className="aa-mono absolute left-[10px] top-[10px] rounded-sm bg-advika-orange px-[7px] py-[4px] text-[10px] font-semibold text-white">
                {selectedWatt}
              </span>
            )}
            <button
              type="button"
              onClick={handleWishlist}
              disabled={isWishlistPending}
              data-testid="product-detail-wishlist-toggle"
              className="absolute right-[9px] top-[9px] flex h-9 w-9 items-center justify-center rounded-full border border-[#333] bg-advika-panel"
            >
              <Icon name={wishlisted ? 'favorite' : 'favorite_border'} size={19} className={wishlisted ? 'text-advika-orange' : 'text-[#e5e5e5]'} />
            </button>
            {images[selectedImage] ? (
              <ImageWithFallback src={images[selectedImage]} alt="" className="h-full w-full object-contain" />
            ) : (
              <Icon name={category?.icon || 'auto_awesome'} size={104} className="text-advika-orange" />
            )}
          </div>
          {/* Thumbnails double as the wattage variant selector (README:
              "each labelled with its wattage and acting as the variant
              selector") — shown whenever there's a Wattage variant group
              OR more than one photo, not gated on real photography
              existing (the design's own placeholder catalog has none). */}
          {(wattageGroup?.options?.length > 1 || images.length > 1) && (
            <div className="grid grid-cols-4 gap-[9px]">
              {(wattageGroup?.options ?? images.map((_, idx) => ({ label: null, idx }))).map((opt, idx) => {
                const isSelected = wattageGroup
                  ? idx === (variantIndex[wattageGroup.label] ?? wattageGroup.defaultIndex ?? 0)
                  : idx === selectedImage;
                const handleSelect = () => {
                  setSelectedImage(Math.min(idx, Math.max(images.length - 1, 0)));
                  if (wattageGroup) {
                    setVariantIndex((prev) => ({ ...prev, [wattageGroup.label]: idx }));
                  }
                };
                return (
                  <button
                    key={opt.label ?? idx}
                    type="button"
                    onClick={handleSelect}
                    data-testid={`product-detail-thumbnail-${idx}`}
                    className={`relative flex h-[60px] items-center justify-center rounded bg-advika-ink ${isSelected ? 'border-2 border-advika-orange' : 'border-2 border-advika-border-dark'}`}
                  >
                    {opt.label && (
                      <span className="aa-mono absolute bottom-[3px] left-1/2 -translate-x-1/2 text-[8px] font-semibold text-advika-grey600">
                        {opt.label}
                      </span>
                    )}
                    {images[idx] ? (
                      <ImageWithFallback src={images[idx]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon name={category?.icon || 'auto_awesome'} size={20} className="text-advika-orange" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Title block */}
        <div className="flex flex-col gap-[13px] px-[14px] pt-[18px]">
          {product.isBestSeller && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-advika-orange-dark">
              <Icon name="military_tech" size={16} /> {t('advika.product.bestSeller', 'BEST SELLER')}
            </span>
          )}
          <h1 className="aa-title-product text-advika-chrome">{name}</h1>
          {voltage.hasVoltage && (
            voltage.isDual ? (
              <span className="flex w-fit items-center gap-2 rounded-sm border border-advika-success-border bg-advika-success-tint px-[10px] py-[6px] text-[11.5px] font-bold text-advika-success-dark">
                <Icon name="bolt" size={16} />
                {t('advika.product.dualVoltageNote')}
              </span>
            ) : (
              // README: "For a single-voltage SKU: a neutral voltage chip
              // stating the requirement plainly ('24V vehicles only')."
              <span className="flex w-fit items-center gap-2 rounded-sm border border-advika-border-light bg-advika-off-white px-[10px] py-[6px] text-[11.5px] font-bold text-advika-grey900">
                <Icon name="bolt" size={16} className="text-advika-grey700" />
                {t('advika.product.singleVoltageChip', { voltage: voltage.label })}
              </span>
            )
          )}
          <div className="flex flex-wrap items-center gap-2">
            {typeof product.rating === 'number' && (
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" size={15} className={i < Math.round(product.rating) ? 'text-advika-orange' : 'text-advika-grey400'} />
                ))}
                <span className="aa-mono ml-1 text-[14px] font-semibold text-advika-chrome">{product.rating.toFixed(1)}</span>
                {typeof product.reviewCount === 'number' && (
                  <span className="text-[12px] text-advika-grey700">{t('advika.product.reviewsCount', { count: product.reviewCount })}</span>
                )}
              </span>
            )}
            {stockInfo.available && (
              <span className="flex items-center gap-1 text-[12px] font-semibold text-advika-success">
                <Icon name="check_circle" size={14} /> {t('productDetail.inStock', 'In Stock')}
              </span>
            )}
          </div>
        </div>

        {/* Price card */}
        <div className="mx-[14px] mt-[18px] flex flex-col gap-2 rounded border border-advika-border-light p-4">
          <div className="flex items-center gap-2">
            <span className="aa-mono text-[29px] font-semibold text-advika-chrome">₹{formatPrice(activeVariantPrice) ?? activeVariantPrice}</span>
            {hasDiscount && <span className="aa-mono text-[15px] text-advika-grey650 line-through">₹{formatPrice(activeVariantMrp)}</span>}
            {discountPct != null && (
              <span className="rounded-[3px] bg-advika-success-tint2 px-2 py-1 text-[11.5px] font-bold text-advika-success-dark">-{discountPct}%</span>
            )}
          </div>
          <p className="pt-[6px] text-[11.5px] text-advika-grey700">{t('advika.product.taxesShipping')}</p>
        </div>

        {/* Variant pickers */}
        {variantGroups.length > 0 && (
          <div className="flex flex-col gap-4 px-[14px] pt-[18px]">
            {variantGroups.map((group) => {
              const idx = variantIndex[group.label] ?? group.defaultIndex ?? 0;
              return (
                <div key={group.label} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2 text-[13.5px]">
                    <span className="font-bold text-advika-chrome">{group.label}</span>
                    <span className="font-bold text-advika-orange">{group.options?.[idx]?.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-[9px]">
                    {group.options?.map((opt, optIdx) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setVariantIndex((prev) => ({ ...prev, [group.label]: optIdx }))}
                        data-testid={`product-detail-variant-${group.label}-${opt.label}`}
                        className={`aa-mono flex h-11 items-center justify-center rounded px-3 text-[13px] font-semibold ${
                          group.label === 'Wattage' ? 'min-w-[62px]' : 'min-w-[70px]'
                        } ${
                          optIdx === idx ? 'border-[1.5px] border-advika-orange bg-advika-orange text-white' : 'border-[1.5px] border-advika-grey400 text-advika-grey900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quantity + CTAs */}
        <div className="flex flex-col gap-[11px] px-[14px] pt-[18px]">
          <div className="flex gap-[11px]">
            <div className="flex h-[52px] overflow-hidden rounded border border-advika-grey400">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} data-testid="product-detail-quantity-decrease" className="w-[42px] border-r border-advika-border-light text-lg">−</button>
              <span className="aa-mono flex min-w-[42px] items-center justify-center text-[16px] font-semibold" data-testid="product-detail-quantity-value">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxSelectableQuantity, q + 1))}
                disabled={quantity >= maxSelectableQuantity}
                data-testid="product-detail-quantity-increase"
                className="w-[42px] border-l border-advika-border-light text-lg disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!stockInfo.available || isAdding}
              data-testid="product-detail-add-to-cart-button"
              className={`flex h-[52px] flex-1 items-center justify-center gap-2 text-[13px] font-bold text-white ${added ? 'bg-advika-success' : 'bg-advika-orange'} disabled:opacity-60`}
            >
              <Icon name={added ? 'check' : 'add_shopping_cart'} size={18} />
              {added ? t('advika.product.addedToCart') : t('advika.cardAddToCart', 'ADD TO CART')}
            </button>
          </div>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!stockInfo.available || isBuyNowPending}
            data-testid="product-detail-buy-now-button"
            className="flex h-[52px] items-center justify-center border-[1.5px] border-advika-chrome text-[13px] font-bold text-advika-chrome disabled:opacity-60"
          >
            {t('advika.product.buyNow', 'BUY NOW')}
          </button>
        </div>

        {/* Fits these vehicles — sits between the quantity/CTA block and
            the pincode check (README: "after the user has chosen a
            variant but before they commit to buying"). */}
        {compatibility && (
          <div className="mx-[14px] mt-[18px] flex flex-col gap-[14px] rounded border border-advika-border-light p-4">
            <div className="flex items-center gap-2">
              <Icon name="local_shipping" size={19} className="text-advika-orange" />
              <span className="text-[14.5px] font-bold text-advika-chrome">{t('advika.product.fitsVehicles', 'Fits these vehicles')}</span>
            </div>
            <div className="flex items-start gap-[9px] rounded-[3px] border border-advika-orange-border bg-advika-orange-tint2 p-3">
              <Icon name="bolt" size={17} className="shrink-0 text-advika-orange-dark" />
              <p className="text-[11.5px] font-semibold text-advika-orange-darker2">
                {voltage.isDual
                  ? t('advika.product.fitmentDualNote')
                  : t('advika.product.fitmentSingleWarning', {
                      voltage: voltage.label,
                      otherVoltage: voltage.has24 ? '12V' : '24V',
                    })}
              </p>
            </div>
            {Object.entries(compatibility).map(([volt, models]) => (
              <div key={volt} className="flex flex-col gap-[9px] border-t border-advika-divider-light pt-[13px]">
                <div className="flex items-center gap-2">
                  <span className={`aa-mono rounded-sm px-2 py-1 text-[11px] font-semibold text-white ${volt.includes('24') ? 'bg-advika-chrome' : 'bg-advika-orange'}`}>{volt}</span>
                  <span className="text-[12px] text-advika-grey700">{volt.includes('24') ? t('advika.product.heavyGroup') : t('advika.product.smallGroup')}</span>
                </div>
                <div className="flex flex-wrap gap-[7px]">
                  {(models || []).map((m) => (
                    <span key={m} className="flex items-center gap-[6px] rounded-[3px] border border-advika-border-light bg-advika-off-white px-[10px] py-[7px] text-[12px] font-semibold text-advika-grey900">
                      <Icon name={getVehicleIcon(m)} size={15} className="text-advika-grey650" /> {m}
                    </span>
                  ))}
                  <span className="flex items-center gap-[6px] rounded-[3px] border border-dashed border-advika-grey400 px-[10px] py-[7px] text-[12px] font-semibold text-advika-grey650">
                    <Icon name="more_horiz" size={15} className="text-advika-grey650" /> {t('advika.product.andSimilar', 'and similar')}
                  </span>
                </div>
              </div>
            ))}
            <a href={BRAND_PHONE_TEL} className="flex h-11 items-center justify-center gap-2 border-[1.5px] border-advika-chrome text-[12px] font-bold text-advika-chrome">
              <Icon name="chat" size={16} /> {t('advika.product.vehicleNotListed')}
            </a>
          </div>
        )}

        {/* Pincode serviceability */}
        <div className="mx-[14px] mt-[18px] flex flex-col gap-3 rounded border border-advika-border-light p-4">
          <div className="flex items-center gap-2">
            <Icon name="where_to_vote" size={19} className="text-advika-orange" />
            <span className="text-[14.5px] font-bold text-advika-chrome">{t('advika.product.deliversToArea')}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              data-testid="product-detail-pincode-input"
              value={pincode}
              onChange={(e) => setPincode(sanitizePincodeInput(e.target.value))}
              maxLength={6}
              placeholder={t('advika.product.pincodePlaceholder')}
              className="aa-mono h-12 flex-1 rounded-[3px] border border-advika-grey400 px-3 text-[15px] tracking-[.08em] outline-none"
            />
            <button
              type="button"
              onClick={retryPincode}
              data-testid="product-detail-pincode-check-button"
              className="h-12 shrink-0 rounded-[3px] bg-advika-chrome px-4 text-[12px] font-bold text-white"
            >
              {t('advika.product.check', 'CHECK')}
            </button>
          </div>
          {pincodeStatus === 'ready' && pincodeData?.serviceable && (
            <div className="flex items-center gap-3 rounded-[3px] border border-advika-success-border bg-advika-success-tint p-3">
              <Icon name="local_shipping" size={18} className="text-advika-success" />
              <div>
                <p className="text-[12.5px] font-bold text-advika-success-dark">
                  {t('advika.product.pinGood', { pincode })}
                </p>
                <p className="text-[11.5px] text-advika-success-dark">
                  {t('advika.product.pinEta')}
                </p>
              </div>
            </div>
          )}
          {pincodeStatus === 'ready' && !pincodeData?.serviceable && (
            <p className="text-[12px] font-semibold text-advika-warning">{t('checkout.shipmentCheckFailed', "Couldn't check delivery for this pincode.")}</p>
          )}
        </div>

        <div className="px-[14px] pt-[18px]">
          <PromiseStrip
            compact
            items={[
              { icon: 'payments', title: t('advika.promise.cod', 'Cash on Delivery') },
              { icon: 'local_shipping', title: t('advika.product.promiseShippingCompact', '3-4 Day Shipping') },
              { icon: 'receipt_long', title: t('advika.promise.gst', 'GST Bill') },
            ]}
          />
        </div>

        {/* Tabbed detail */}
        <div className="mx-[14px] mt-[18px] overflow-hidden rounded border border-advika-border-light">
          <div className="flex border-b border-advika-divider-light">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                data-testid={`product-detail-tab-${tab}`}
                className={`h-[50px] flex-1 border-b-[2.5px] text-[12.5px] font-bold ${
                  activeTab === tab ? 'border-advika-orange text-advika-orange-dark' : 'border-transparent text-advika-grey700'
                }`}
              >
                {tab === 'reviews' && typeof product.reviewCount === 'number' && product.reviewCount > 0
                  ? t('advika.product.tabReviewsCount', { count: product.reviewCount })
                  : t(`advika.product.tab${tab[0].toUpperCase()}${tab.slice(1)}`)}
              </button>
            ))}
          </div>
          <div className="p-4">
            {activeTab === 'description' && (
              product.description ? (
                <div
                  className="text-[13.5px] leading-[1.7] text-advika-grey900"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(getLocalized(product.description, lang)) }}
                />
              ) : (
                <p className="text-[13px] text-advika-grey700">{t('advika.product.noSpecs')}</p>
              )
            )}
            {activeTab === 'specifications' && (
              specs.length > 0 ? (
                <div className="flex flex-col">
                  {specs.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3 border-b border-advika-divider-light py-[13px] last:border-0">
                      <span className="w-[44%] shrink-0 text-[12.5px] text-advika-grey650">{key}</span>
                      <span className="text-right text-[13px] font-semibold text-advika-grey900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-advika-grey700">{t('advika.product.noSpecs')}</p>
              )
            )}
            {activeTab === 'reviews' && (
              typeof product.rating === 'number' && product.reviewCount > 0 ? (
                // No per-review list/rating-distribution data exists on the
                // backend yet (Review isn't aggregated per product beyond
                // the pre-aggregated rating/reviewCount fields — see
                // prisma/schema.prisma's Product model comment) — this
                // summary is the honest subset of README's Reviews tab
                // spec (line 188) buildable from what's actually served,
                // rather than a "no reviews yet" that contradicts the
                // rating row directly above it.
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="font-archivoBlack text-[34px] leading-none text-advika-chrome">{product.rating.toFixed(1)}</div>
                    <div className="aa-label text-[9.5px] text-advika-grey650">{t('advika.product.outOf5', 'OUT OF 5')}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-advika-grey700">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon key={i} name="star" size={16} className={i < Math.round(product.rating) ? 'text-advika-orange' : 'text-advika-grey400'} />
                    ))}
                    <span>{t('advika.product.reviewsCount', { count: product.reviewCount })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-advika-grey700">{t('advika.product.noReviews')}</p>
              )
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="flex flex-col gap-[13px] px-[14px] pt-6">
            <h2 className="font-archivoBlack text-[19px] text-advika-chrome">
              {t('advika.product.alsoLike1', 'YOU MAY ALSO')}{' '}
              <span className="text-advika-orange">{t('advika.product.alsoLike2', 'LIKE')}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {related.map((p) => <AdvikaProductCard key={p.id} product={p} imageHeight={110} />)}
            </div>
          </div>
        )}

        <div className="mt-6">
          <AdvikaFooter />
        </div>
      </main>

      <StickyActionBar eyebrow={variantMetaLabel} value={`₹${formatPrice(activeVariantPrice) ?? activeVariantPrice}`}>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!stockInfo.available || isAdding}
          data-testid="product-detail-sticky-add-to-cart-button"
          className={`flex h-[52px] w-full items-center justify-center gap-2 text-[13px] font-bold text-white ${added ? 'bg-advika-success' : 'bg-advika-orange'} disabled:opacity-60`}
        >
          <Icon name={added ? 'check' : 'add_shopping_cart'} size={18} />
          {added ? t('advika.product.addedToCart') : t('buttons.addToCart', 'Add to Cart')}
        </button>
      </StickyActionBar>
    </div>
  );
}
