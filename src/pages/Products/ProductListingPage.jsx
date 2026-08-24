// src/pages/Products/ProductListingPage.jsx — Advika Auto Category listing
// See design_handoff_advika_auto/README.md, screen 3 "Category listing".
// Reuses useProductListing (URL-driven filters/pagination against the
// real GET /api/products) — only the presentation layer is new.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import AdvikaProductCard from '@/components/Product/AdvikaProductCard';
import WhatsAppStrip from '@/components/Shared/WhatsAppStrip';
import PromiseStrip from '@/components/Shared/PromiseStrip';
import {
  useProductListing,
  STATUS_LOADING,
  STATUS_LOADING_MORE,
  STATUS_SUCCESS,
  STATUS_EMPTY,
  STATUS_ERROR,
} from '@/features/products/hooks/useProductListing';
import { CATEGORIES, getCategoryByLabel } from '@/config/advikaAuto';

export default function ProductListingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get('category') || '';
  const activeCategory = getCategoryByLabel(categoryParam);
  const under3000 = searchParams.get('maxPrice') === '3000';
  const codOnly = searchParams.get('cod') === '1';
  const voltageFilter = searchParams.get('voltage') || ''; // '12V' | '24V' | ''
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const updateParams = useCallback(
    (patch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') next.delete(key);
          else next.set(key, value);
        });
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const selectCategory = useCallback(
    (label) => {
      // Voltage only means anything for lights/electrical — switching to a
      // category that isn't voltage-relevant clears a stale voltage
      // filter, matching the design's rule that results are never
      // silently narrowed by a control the user can no longer see.
      const cat = getCategoryByLabel(label);
      updateParams({ category: label, voltage: cat?.voltageRelevant ? voltageFilter : '' });
    },
    [updateParams, voltageFilter]
  );

  const toggleVoltage = useCallback(
    (v) => updateParams({ voltage: voltageFilter === v ? '' : v }),
    [updateParams, voltageFilter]
  );

  const toggleUnder3000 = useCallback(
    () => updateParams({ maxPrice: under3000 ? '' : '3000' }),
    [updateParams, under3000]
  );

  const toggleCodOnly = useCallback(
    () => updateParams({ cod: codOnly ? '' : '1' }),
    [updateParams, codOnly]
  );

  // Matches the wireframe's "Best selling" pill exactly: a fixed, always-on
  // sort with no visible control — but backed by the real isBestSeller
  // flag rather than createdAt, so the label is still telling the truth.
  const filters = useMemo(
    () => ({
      category: categoryParam ? [categoryParam] : [],
      minPrice: '',
      maxPrice: under3000 ? '3000' : '',
      sort: 'isBestSeller',
      order: 'desc',
    }),
    [categoryParam, under3000]
  );

  // Resets pagination whenever the filter set itself changes (category,
  // price) — kept as local state since voltage isn't part of the
  // backend's real filter contract yet, unlike the rest of the app's
  // URL-`page`-driven listing pages.
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const { status, items, meta, hasMore, retry } = useProductListing(filters, page);

  // The backend has no `voltage` field yet (see prisma/schema.prisma) —
  // this filters client-side against whatever the API returns so the
  // chip is functional the moment that field lands, and a harmless no-op
  // (nothing has a voltage) until then.
  const visibleItems = items
    .filter((p) => (voltageFilter ? String(p.voltage || '').includes(voltageFilter) : true))
    // No SKU in this catalog opts out of Cash on Delivery today (COD is
    // a storefront-wide promise, not a per-product flag — see the
    // README's trust grid), so this is a real, wired predicate that
    // currently always passes; it starts actually filtering the moment
    // a product ever sets `codEligible: false`.
    .filter((p) => (codOnly ? p.codEligible !== false : true));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const hasActiveFilters = !!categoryParam || under3000 || !!voltageFilter || codOnly;
  const clearAll = () => setSearchParams({}, { replace: true });

  const categoryTitle = activeCategory ? t(`advika.category.${activeCategory.id}`) : t('advika.category.all', 'All');

  return (
    <div className="aa-shell min-h-screen bg-white">
      <Seo canonicalPath="/products" description={t('products.seoDescription', 'Browse truck, tempo, pickup and tractor lights, horns and accessories.')} />
      <AdvikaHeader />

      <main id="main-content" tabIndex={-1}>
        {/* Title block */}
        <div className="flex flex-col gap-[14px] bg-advika-near-black px-4 pb-[18px] pt-[22px]">
          <button type="button" onClick={() => navigate('/')} className="aa-label flex items-center gap-[6px] text-left text-[10.5px] uppercase text-advika-grey600">
            <Icon name="arrow_back" size={15} /> {t('common.home', 'Home')}
          </button>
          <h1 className="aa-title-md text-white">{categoryTitle}</h1>
          {meta?.total != null && (
            <p className="text-[11.5px] text-advika-grey600">
              {t('advika.categoryPage.resultCount', { count: meta.total })}
            </p>
          )}
          <form onSubmit={handleSearchSubmit} className="flex h-[46px] items-center gap-2 rounded border border-[#333] bg-advika-panel px-[13px]">
            <Icon name="search" size={19} className="text-advika-grey700" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('advika.categoryPage.searchPlaceholder')}
              className="w-full bg-transparent text-[13.5px] text-white placeholder-advika-grey700 outline-none"
            />
          </form>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto border-b border-advika-border-dark bg-advika-chrome px-[14px] py-3">
          <button
            type="button"
            onClick={() => updateParams({ category: '', voltage: '' })}
            className={`flex h-[38px] shrink-0 items-center gap-[7px] rounded-full px-[15px] text-[12.5px] font-semibold ${
              !categoryParam ? 'bg-advika-orange text-white' : 'border border-[#333] text-advika-grey600'
            }`}
          >
            <Icon name="grid_view" size={17} /> {t('advika.category.all', 'All')}
          </button>
          {CATEGORIES.filter((c) => c.chip).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.label)}
              className={`flex h-[38px] shrink-0 items-center gap-[7px] rounded-full px-[15px] text-[12.5px] font-semibold ${
                activeCategory?.id === cat.id ? 'bg-advika-orange text-white' : 'border border-[#333] text-advika-grey600'
              }`}
            >
              <Icon name={cat.icon} size={17} />
              {t(`advika.category.${cat.id === 'interior' ? 'interiorShort' : cat.id === 'exterior' ? 'exteriorShort' : cat.id === 'electrical' ? 'electricalShort' : cat.id === 'spares' ? 'sparesShort' : cat.id}`)}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-[9px] overflow-x-auto border-b border-advika-border-light bg-white px-[14px] py-[11px]">
          <button
            type="button"
            aria-pressed="true"
            className="flex h-9 shrink-0 items-center gap-[6px] rounded-[3px] border border-advika-orange bg-advika-orange-tint px-3 text-[11.5px] font-semibold text-advika-orange-darker"
          >
            <Icon name="sort" size={15} /> {t('advika.categoryPage.bestSelling', 'Best selling')}
          </button>
          {activeCategory?.voltageRelevant && (
            <>
              <button
                type="button"
                onClick={() => toggleVoltage('12V')}
                className={`flex h-9 shrink-0 items-center gap-[6px] rounded-[3px] px-3 text-[11.5px] font-semibold ${
                  voltageFilter === '12V' ? 'border border-advika-orange bg-advika-orange-tint text-advika-orange-darker' : 'border border-advika-border-light text-advika-grey700'
                }`}
              >
                <Icon name="bolt" size={15} /> 12V · {t('advika.categoryPage.battery12', '1 battery')}
              </button>
              <button
                type="button"
                onClick={() => toggleVoltage('24V')}
                className={`flex h-9 shrink-0 items-center gap-[6px] rounded-[3px] px-3 text-[11.5px] font-semibold ${
                  voltageFilter === '24V' ? 'border border-advika-orange bg-advika-orange-tint text-advika-orange-darker' : 'border border-advika-border-light text-advika-grey700'
                }`}
              >
                <Icon name="bolt" size={15} /> 24V · {t('advika.categoryPage.battery24', '2 battery')}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleCodOnly}
            aria-pressed={codOnly}
            className={`flex h-9 shrink-0 items-center gap-[6px] rounded-[3px] px-3 text-[11.5px] font-semibold ${
              codOnly ? 'border border-advika-orange bg-advika-orange-tint text-advika-orange-darker' : 'border border-advika-border-light text-advika-grey700'
            }`}
          >
            <Icon name="payments" size={15} /> {t('advika.categoryPage.codOnly', 'COD only')}
          </button>
          <button
            type="button"
            onClick={toggleUnder3000}
            className={`flex h-9 shrink-0 items-center gap-[6px] rounded-[3px] px-3 text-[11.5px] font-semibold ${
              under3000 ? 'border border-advika-orange bg-advika-orange-tint text-advika-orange-darker' : 'border border-advika-border-light text-advika-grey700'
            }`}
          >
            <Icon name="sell" size={15} /> {t('advika.categoryPage.under3000', 'Under ₹3,000')}
          </button>
        </div>

        {activeCategory?.voltageRelevant && (
          <div className="flex items-center gap-2 border-b border-advika-orange-border bg-advika-orange-tint px-[14px] py-[10px]">
            <Icon name="bolt" size={16} className="shrink-0 text-advika-orange-dark" />
            <p className="text-[12px] font-semibold text-advika-orange-darker2">
              {t('advika.categoryPage.voltPick', 'Pick the voltage that matches your vehicle — 12V or 24V')}
            </p>
          </div>
        )}

        {/* Product grid */}
        <div className="px-[14px] pt-[14px]">
          {status === STATUS_LOADING && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
            </div>
          )}

          {status === STATUS_ERROR && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-advika-grey700">{t('products.error', 'Something went wrong while loading products.')}</p>
              <button type="button" onClick={retry} className="border-[1.5px] border-advika-chrome px-6 py-2 text-[13px] font-bold">
                {t('buttons.retry', 'Retry')}
              </button>
            </div>
          )}

          {status === STATUS_EMPTY || (status === STATUS_SUCCESS && visibleItems.length === 0) ? (
            <div className="flex flex-col items-center gap-[15px] px-6 py-12 text-center">
              <span className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#e9e7e3]">
                <Icon name="search_off" size={38} className="text-advika-grey650" />
              </span>
              <h2 className="font-archivoBlack text-[20px] text-advika-chrome">{t('advika.categoryPage.emptyTitle')}</h2>
              <p className="max-w-[290px] text-[13.5px] text-advika-grey800">{t('advika.categoryPage.emptyBody')}</p>
              <button type="button" onClick={clearAll} className="h-12 bg-advika-chrome px-6 text-[13px] font-bold text-white">
                {t('advika.categoryPage.clearAll')}
              </button>
            </div>
          ) : null}

          {(status === STATUS_SUCCESS || status === STATUS_LOADING_MORE) && visibleItems.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {visibleItems.map((p) => (
                  <AdvikaProductCard
                    key={p.id}
                    product={p}
                    imageHeight={118}
                    dense
                    codLabelKey="advika.categoryPage.codShort"
                    codLabelDefault="COD"
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center py-6">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={status === STATUS_LOADING_MORE}
                    className="border-[1.5px] border-advika-chrome px-8 py-3 text-[13px] font-bold disabled:opacity-50"
                  >
                    {status === STATUS_LOADING_MORE ? t('search.loadingMore', 'Loading…') : t('search.loadMore', 'Load More')}
                  </button>
                </div>
              )}
            </>
          )}
          {hasActiveFilters && status !== STATUS_EMPTY && (
            <div className="pb-2 pt-4 text-center">
              <button type="button" onClick={clearAll} className="text-[12px] font-semibold text-advika-orange-dark underline">
                {t('products.clearFilters', 'Clear all')}
              </button>
            </div>
          )}
        </div>

        <div className="px-[14px] pt-6">
          <WhatsAppStrip
            titleKey="advika.categoryPage.waTitleShort"
            titleDefault="Can't find the part?"
            subtitleKey="advika.categoryPage.waSubtitle"
            subtitleDefault="Send your vehicle model, we'll source it"
          />
        </div>

        <div className="px-[14px] pb-6 pt-4">
          <PromiseStrip
            compact
            items={[
              { icon: 'payments', title: t('advika.promise.cod', 'Cash on Delivery') },
              { icon: 'local_shipping', title: t('advika.product.promiseShippingCompact', '3-4 Day Shipping') },
              { icon: 'receipt_long', title: t('advika.promise.gst', 'GST Bill') },
            ]}
          />
        </div>

        <AdvikaFooter />
      </main>
    </div>
  );
}
