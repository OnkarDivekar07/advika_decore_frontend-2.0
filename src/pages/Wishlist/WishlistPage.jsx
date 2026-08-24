// src/pages/Wishlist/WishlistPage.jsx — Advika Auto Wishlist
// See design_handoff_advika_auto/README.md, screen 9 "Wishlist".
import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import PromiseStrip from '@/components/Shared/PromiseStrip';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { getLocalized } from '@/utils/i18nUtils';
import { getStockInfo, formatPrice } from '@/utils/productUtils';
import { buildProductPath } from '@/seo/seoUtils';
import { getCategoryByLabel, getVoltageInfo } from '@/config/advikaAuto';

function WishlistItemCard({ item, onRemove, isRemoving }) {
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const product = item.product;
  const name = getLocalized(product?.name, i18n.language) || t('productDetail.unnamedProduct', 'Unnamed product');
  const stock = getStockInfo(product);
  const category = getCategoryByLabel(product?.category?.[0]);
  const mrp = product?.mrp;
  const hasDiscount = typeof mrp === 'number' && mrp > product.price;
  const voltage = getVoltageInfo(product);
  const wattage = product?.specs?.Wattage;

  const handleAdd = useCallback(async () => {
    if (isAdding || !stock.available) return;
    setIsAdding(true);
    try {
      await addItem(product, 1);
      setAdded(true);
      toast.success(t('productDetail.addedToCart', 'Added to cart!'));
    } catch {
      // toasted by CartContext
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, stock.available, addItem, product, t]);

  return (
    <div className="flex flex-col overflow-hidden border border-advika-border-light bg-white" data-testid={`wishlist-item-${item.productId}`}>
      <div className="relative flex h-[132px] items-center justify-center bg-advika-ink">
        {/* Wattage/spec + voltage badges — README's Domain rule table
            lists "wishlist" as a required voltage-badge surface. */}
        {(wattage || voltage.hasVoltage) && (
          <div className="absolute left-2 top-2 z-10 flex gap-1">
            {wattage && (
              <span className="aa-mono rounded-sm bg-advika-orange px-[6px] py-[3px] text-[9.5px] font-semibold text-white">{wattage}</span>
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
        )}
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          disabled={isRemoving}
          aria-label={t('productDetail.removedFromWishlist', 'Remove from wishlist')}
          data-testid={`wishlist-item-remove-${item.productId}`}
          className="absolute right-[7px] top-[7px] z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-advika-danger-bright"
        >
          <Icon name="close" size={16} className="text-white" />
        </button>
        <Link to={buildProductPath(product, name)} className="absolute inset-0" aria-label={name} />
        {product?.images?.[0] ? (
          <ImageWithFallback src={product.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name={category?.icon || 'auto_awesome'} size={52} className="text-advika-orange" />
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">
        {category && <span className="text-[9px] font-semibold text-advika-orange-dark">{t(`advika.category.${category.id}`)}</span>}
        <Link to={buildProductPath(product, name)} className="min-h-[36px] text-[13.5px] font-bold leading-[1.35] text-advika-chrome line-clamp-2">
          {name}
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="aa-mono text-[16px] font-semibold text-advika-chrome">₹{formatPrice(product?.price) ?? product?.price}</span>
          {hasDiscount && <span className="aa-mono text-[11px] text-advika-grey650 line-through">₹{formatPrice(mrp)}</span>}
        </div>
        <div className="flex items-center gap-1 text-[10.5px] font-semibold">
          {!stock.available ? (
            <><Icon name="cancel" size={14} className="text-advika-danger" /><span className="text-advika-danger">{t('advika.wishlistPage.outOfStock')}</span></>
          ) : stock.isLow ? (
            <><Icon name="error" size={14} className="text-advika-warning" /><span className="text-advika-warning">{t('advika.wishlistPage.lowStock', { count: stock.quantity })}</span></>
          ) : (
            <><Icon name="check_circle" size={14} className="text-advika-success" /><span className="text-advika-success">{t('advika.wishlistPage.inStock')}</span></>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!stock.available || isAdding}
          data-testid={`wishlist-item-add-to-cart-${item.productId}`}
          className={`flex h-11 items-center justify-center gap-2 text-[11px] font-bold text-white ${
            !stock.available ? 'cursor-default bg-advika-warm-white text-advika-grey700' : added ? 'bg-advika-success' : 'bg-advika-chrome'
          }`}
        >
          <Icon name={!stock.available ? 'notifications' : added ? 'check' : 'add_shopping_cart'} size={15} />
          {!stock.available ? t('advika.cardNotifyMe', 'NOTIFY ME') : added ? t('advika.cardAdded', 'ADDED') : t('advika.cardAddToCart', 'ADD TO CART')}
        </button>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, isSyncing, loadError, retryLoad, removeItem, mutatingIds } = useWishlist();
  const { addItem } = useCart();
  const [isAddingAll, setIsAddingAll] = useState(false);

  const handleAddAll = useCallback(async () => {
    setIsAddingAll(true);
    try {
      const inStock = items.filter((i) => getStockInfo(i.product).available);
      await Promise.allSettled(inStock.map((i) => addItem(i.product, 1)));
      toast.success(t('productDetail.addedToCart', 'Added to cart!'));
    } finally {
      setIsAddingAll(false);
    }
  }, [items, addItem, t]);

  return (
    <div className="aa-shell min-h-screen bg-white">
      <Seo title={t('wishlist.title', 'My Wishlist')} noindex />
      <AdvikaHeader />

      <main id="main-content" tabIndex={-1}>
        {isSyncing ? (
          <div className="flex justify-center py-24"><Spinner size={40} /></div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center" role="alert">
            <Icon name="error" size={40} className="text-advika-grey650" />
            <p className="text-advika-grey700">{t('wishlist.loadError', "We couldn't load your wishlist.")}</p>
            <button type="button" onClick={retryLoad} data-testid="wishlist-retry-button" className="h-11 border-[1.5px] border-advika-chrome px-6 text-[13px] font-bold">{t('buttons.retry', 'Retry')}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-[60px] text-center" data-testid="wishlist-empty-state">
            <span className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#e9e7e3]">
              <Icon name="favorite_border" size={40} className="text-advika-grey650" />
            </span>
            <h1 className="font-archivoBlack text-[21px] text-advika-chrome">{t('advika.wishlistPage.emptyTitle')}</h1>
            <p className="max-w-[290px] text-[13.5px] text-advika-grey800">{t('advika.wishlistPage.emptyBody')}</p>
            <button type="button" onClick={() => navigate('/products')} data-testid="wishlist-browse-products-button" className="flex h-[54px] items-center bg-advika-orange px-8 text-[14px] font-bold text-white">
              {t('advika.wishlistPage.browseProducts')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 bg-advika-near-black px-4 pb-6 pt-6">
              <Link to="/products" className="flex items-center gap-1 text-[10.5px] text-advika-grey600">
                <Icon name="arrow_back" size={15} /> {t('advika.cartPage.backToShop', 'BACK TO SHOP')}
              </Link>
              <div className="flex items-center gap-2">
                <Icon name="favorite" size={30} className="text-advika-orange" />
                <div>
                  <h1 className="aa-title-lg text-white">
                    {t('advika.wishlistPage.titleLine1', 'MY')} <span className="text-advika-orange">{t('advika.wishlistPage.titleAccent', 'WISHLIST')}</span>
                  </h1>
                  <p className="text-[11.5px] text-advika-grey600">{t('advika.wishlistPage.savedItems', { count: items.length })}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddAll}
                disabled={isAddingAll}
                data-testid="wishlist-add-all-to-cart-button"
                className="flex h-[52px] items-center justify-center gap-2 bg-advika-orange text-[14px] font-bold text-white disabled:opacity-60"
              >
                <Icon name="shopping_cart" size={18} /> {t('advika.wishlistPage.addAllToCart')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 px-[14px] pt-4">
              {items.map((item) => (
                <WishlistItemCard key={item.productId} item={item} onRemove={removeItem} isRemoving={mutatingIds.has(item.productId)} />
              ))}
            </div>

            <div className="px-[14px] pt-6">
              <PromiseStrip
                compact
                items={[
                  { icon: 'payments', title: t('advika.promise.cod', 'Cash on Delivery') },
                  { icon: 'local_shipping', title: t('advika.wishlistPage.promiseShipping', 'Free 3-4 day shipping') },
                  { icon: 'receipt_long', title: t('advika.wishlistPage.promiseGst', 'GST bill') },
                ]}
              />
            </div>

            <AdvikaFooter />
          </>
        )}
      </main>
    </div>
  );
}
