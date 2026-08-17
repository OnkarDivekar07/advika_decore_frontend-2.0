// src/pages/Products/ProductListingPage.jsx
import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiFilter, FiAlertCircle, FiRefreshCw, FiPackage, FiX } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import ProductCard from '@/components/Product/ProductCard';
import ProductFilters from '@/components/Product/ProductFilters';
import FilterDrawer from '@/components/Product/FilterDrawer';
import Seo from '@/components/Shared/Seo';
import { useDebouncedValue } from '@/features/products/hooks/useDebouncedValue';
import { sanitizePriceInput, validatePriceRange } from '@/utils/productUtils';
import {
  useProductListing,
  STATUS_LOADING,
  STATUS_LOADING_MORE,
  STATUS_SUCCESS,
  STATUS_EMPTY,
  STATUS_ERROR,
} from '@/features/products/hooks/useProductListing';

const SKELETON_COUNT = 8;
const PRICE_DEBOUNCE_MS = 500;

const SORT_OPTIONS = [
  { value: 'newest', sort: 'createdAt', order: 'desc' },
  { value: 'price_asc', sort: 'price', order: 'asc' },
  { value: 'price_desc', sort: 'price', order: 'desc' },
  { value: 'name_asc', sort: 'name', order: 'asc' },
];

function sortValueFromParams(sort, order) {
  const found = SORT_OPTIONS.find((o) => o.sort === sort && o.order === order);
  return found ? found.value : SORT_OPTIONS[0].value;
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5" aria-busy="true">
      <span className="sr-only" role="status">Loading products…</span>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="skeleton aspect-[3/4]" aria-hidden="true" />
      ))}
    </div>
  );
}

export default function ProductListingPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- Read filter state straight from the URL — this is the single
  // source of truth, so refresh/back/forward always reproduce the exact
  // same view without any extra local state to fall out of sync. -------
  const categoryParam = searchParams.get('category') || '';
  const selectedCategories = useMemo(
    () => categoryParam.split(',').map((c) => c.trim()).filter(Boolean),
    [categoryParam]
  );
  const minPriceUrl = searchParams.get('minPrice') || '';
  const maxPriceUrl = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === '1';
  const sortValue = sortValueFromParams(
    searchParams.get('sort') || 'createdAt',
    searchParams.get('order') || 'desc'
  );
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  // Price inputs are debounced locally before they hit the URL/API, so
  // typing a number doesn't fire a request per keystroke. They're
  // seeded from the URL so a shared link / refresh shows the right value.
  const [minPriceInput, setMinPriceInputRaw] = useState(minPriceUrl);
  const [maxPriceInput, setMaxPriceInputRaw] = useState(maxPriceUrl);
  const debouncedMinPrice = useDebouncedValue(minPriceInput, PRICE_DEBOUNCE_MS);
  const debouncedMaxPrice = useDebouncedValue(maxPriceInput, PRICE_DEBOUNCE_MS);

  const setMinPriceInput = useCallback((raw) => setMinPriceInputRaw(sanitizePriceInput(raw)), []);
  const setMaxPriceInput = useCallback((raw) => setMaxPriceInputRaw(sanitizePriceInput(raw)), []);

  // Invalid (min > max) ranges are never sent to the API — they can only
  // ever return zero results, or worse, be silently misread by the
  // backend. The inputs stay editable and the error surfaces in the
  // filter panel until the user fixes it. Checked against the live
  // (non-debounced) inputs so the inline error appears immediately as
  // the user types, not after the debounce delay.
  const priceRangeError = !validatePriceRange(minPriceInput, maxPriceInput).valid;
  const debouncedPriceRangeValid = validatePriceRange(debouncedMinPrice, debouncedMaxPrice).valid;

  // Back/forward nav, "Clear all", or a shared link changing the URL's
  // price params should update the visible inputs too. This is a no-op
  // when the URL was set by our own debounced-sync effect below, since
  // the values already match.
  React.useEffect(() => {
    setMinPriceInput(minPriceUrl);
    setMaxPriceInput(maxPriceUrl);
  }, [minPriceUrl, maxPriceUrl, setMinPriceInput, setMaxPriceInput]);

  // Helper: update the URL, resetting to page 1 whenever a filter (as
  // opposed to just the page itself) changes.
  const updateParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') next.delete(key);
            else next.set(key, value);
          });
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Sync debounced price back into the URL, only when it actually differs
  // — and only when it's a valid range. An invalid one (min > max) is
  // left out of the URL/API entirely rather than firing a filter request
  // that's guaranteed to be wrong; the user sees the inline error instead.
  React.useEffect(() => {
    if (!debouncedPriceRangeValid) return;
    if (debouncedMinPrice === minPriceUrl && debouncedMaxPrice === maxPriceUrl) return;
    updateParams({ minPrice: debouncedMinPrice, maxPrice: debouncedMaxPrice });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMinPrice, debouncedMaxPrice, debouncedPriceRangeValid]);

  const toggleCategory = useCallback(
    (cat) => {
      const next = selectedCategories.includes(cat)
        ? selectedCategories.filter((c) => c !== cat)
        : [...selectedCategories, cat];
      updateParams({ category: next.join(',') });
    },
    [selectedCategories, updateParams]
  );

  const toggleInStock = useCallback(() => {
    updateParams({ inStock: inStock ? '' : '1' });
  }, [inStock, updateParams]);

  const handleSortChange = useCallback(
    (value) => {
      const opt = SORT_OPTIONS.find((o) => o.value === value) || SORT_OPTIONS[0];
      updateParams({ sort: opt.sort, order: opt.order });
    },
    [updateParams]
  );

  const handleClearFilters = useCallback(() => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams({}, { replace: true });
  }, [setSearchParams, setMinPriceInput, setMaxPriceInput]);

  const handleLoadMore = useCallback(() => {
    updateParams({ page: String(page + 1) }, { resetPage: false });
  }, [page, updateParams]);

  const hasActiveFilters =
    selectedCategories.length > 0 || !!minPriceUrl || !!maxPriceUrl || inStock;

  // --- Data ---------------------------------------------------------
  const filters = useMemo(
    () => ({
      category: selectedCategories,
      minPrice: minPriceUrl,
      maxPrice: maxPriceUrl,
      inStock,
      sort: searchParams.get('sort') || 'createdAt',
      order: searchParams.get('order') || 'desc',
    }),
    [selectedCategories, minPriceUrl, maxPriceUrl, inStock, searchParams]
  );

  const { status, items, meta, hasMore, retry } = useProductListing(filters, page);

  // --- SEO ------------------------------------------------------------
  // Only a single selected category is treated as a "real" indexable
  // facet page (e.g. /products?category=Truck) — a meaningful, stable
  // destination worth its own canonical/title. Everything else (price
  // range, in-stock toggle, sort order, pagination, or multiple
  // categories at once) produces the same thin/duplicate content under
  // combinatorially many URLs, so those variants canonicalize back to
  // the clean base/category URL and are marked noindex rather than
  // asking search engines to crawl every filter combination.
  const isSingleCategory = selectedCategories.length === 1;
  const hasNonCategoryFilters = !!minPriceUrl || !!maxPriceUrl || inStock || page > 1;
  const seoCanonicalPath = isSingleCategory
    ? `/products?category=${encodeURIComponent(selectedCategories[0])}`
    : '/products';
  const seoNoindex = hasNonCategoryFilters || selectedCategories.length > 1;
  const seoCategoryLabel = isSingleCategory
    ? t(`categories.${selectedCategories[0].toLowerCase().replace(/\s+/g, '')}`, selectedCategories[0])
    : null;
  const seoTitle = seoCategoryLabel
    ? t('products.seoCategoryTitle', '{{category}} — Décor & Accessories', { category: seoCategoryLabel })
    : t('products.seoTitle', 'All Products');
  const seoDescription = seoCategoryLabel
    ? t('products.seoCategoryDescription', 'Shop {{category}} décor and accessories.', { category: seoCategoryLabel })
    : t('products.seoDescription', 'Browse vehicle décor and accessories for trucks, tempos, pickups, cars, two-wheelers, and tractors.');

  const filterPanelProps = {
    selectedCategories,
    onToggleCategory: toggleCategory,
    minPrice: minPriceInput,
    maxPrice: maxPriceInput,
    onMinPriceChange: setMinPriceInput,
    onMaxPriceChange: setMaxPriceInput,
    priceRangeError,
    inStock,
    onToggleInStock: toggleInStock,
    onClear: handleClearFilters,
    hasActiveFilters,
  };

  return (
    <>
      <Navbar />
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonicalPath={seoCanonicalPath}
        noindex={seoNoindex}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10" id="main-content" tabIndex={-1}>
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="section-title">{t('products.title', 'All Products')}</h1>

          {/* Mobile filter trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden btn btn-outline relative shrink-0"
          >
            <FiFilter className="w-4 h-4" aria-hidden />
            {t('products.filters', 'Filters')}
            {hasActiveFilters && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {selectedCategories.length + (minPriceUrl || maxPriceUrl ? 1 : 0) + (inStock ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24 card p-5">
              <ProductFilters {...filterPanelProps} />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Toolbar: active filter chips + sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-2">
                {selectedCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-[var(--clr-primary-dark)] border border-[var(--clr-primary-dark)]/30 hover:bg-primary/30 transition-colors"
                  >
                    {t(`categories.${cat.toLowerCase().replace(/\s/g, '')}`, cat)}
                    <FiX className="w-3.5 h-3.5" aria-hidden />
                  </button>
                ))}
                {(minPriceUrl || maxPriceUrl) && (
                  <button
                    onClick={() => updateParams({ minPrice: '', maxPrice: '' })}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-[var(--clr-primary-dark)] border border-[var(--clr-primary-dark)]/30 hover:bg-primary/30 transition-colors"
                  >
                    ₹{minPriceUrl || '0'} – {maxPriceUrl || t('products.any', 'Any')}
                    <FiX className="w-3.5 h-3.5" aria-hidden />
                  </button>
                )}
                {inStock && (
                  <button
                    onClick={toggleInStock}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-[var(--clr-primary-dark)] border border-[var(--clr-primary-dark)]/30 hover:bg-primary/30 transition-colors"
                  >
                    {t('products.inStockOnly', 'In stock only')}
                    <FiX className="w-3.5 h-3.5" aria-hidden />
                  </button>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline underline-offset-2"
                  >
                    {t('products.clearFilters', 'Clear all')}
                  </button>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
                {t('products.sortBy', 'Sort by')}
                <select
                  value={sortValue}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:border-primary"
                >
                  <option value="newest">{t('products.sortNewest', 'Newest')}</option>
                  <option value="price_asc">{t('products.sortPriceAsc', 'Price: Low to High')}</option>
                  <option value="price_desc">{t('products.sortPriceDesc', 'Price: High to Low')}</option>
                  <option value="name_asc">{t('products.sortNameAsc', 'Name: A to Z')}</option>
                </select>
              </label>
            </div>

            {meta?.total > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                {t('products.resultCount', '{{count}} products', { count: meta.total })}
              </p>
            )}

            {status === STATUS_LOADING && <ResultsSkeleton />}

            {status === STATUS_ERROR && (
              <div className="flex flex-col items-center text-center gap-3 py-20" role="alert">
                <FiAlertCircle className="w-12 h-12 text-red-400" aria-hidden />
                <p className="text-gray-600">{t('products.error', 'Something went wrong while loading products.')}</p>
                <button onClick={retry} className="btn btn-outline mt-1">
                  <FiRefreshCw className="w-4 h-4" aria-hidden />
                  {t('search.retry', 'Try Again')}
                </button>
              </div>
            )}

            {status === STATUS_EMPTY && (
              <div className="flex flex-col items-center text-center gap-3 py-20">
                <FiPackage className="w-12 h-12 text-gray-300" aria-hidden />
                <h2 className="text-lg font-semibold text-gray-700">
                  {t('products.noResultsTitle', 'No products found')}
                </h2>
                <p className="text-gray-500 max-w-sm">
                  {t('products.noResultsHint', 'Try removing some filters or widening your price range.')}
                </p>
                {hasActiveFilters && (
                  <button onClick={handleClearFilters} className="btn btn-outline mt-1">
                    {t('products.clearFilters', 'Clear all')}
                  </button>
                )}
              </div>
            )}

            {(status === STATUS_SUCCESS || status === STATUS_LOADING_MORE) && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={status === STATUS_LOADING_MORE}
                      className="btn btn-outline px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status === STATUS_LOADING_MORE
                        ? t('search.loadingMore', 'Loading…')
                        : t('search.loadMore', 'Load More')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} resultCount={meta?.total} {...filterPanelProps} />
    </>
  );
}
