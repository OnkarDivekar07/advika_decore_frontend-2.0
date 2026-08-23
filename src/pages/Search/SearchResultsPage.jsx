// src/pages/Search/SearchResultsPage.jsx — Advika Auto Search results
// Not one of the 10 screens in design_handoff_advika_auto/README.md (the
// design's search box lives on the Category screen, no standalone results
// page is specced) — restyled into the same aa-shell/AdvikaHeader/
// AdvikaProductCard system as every other screen instead of inventing an
// unrelated visual language, per the README's "same header on all
// screens... it now reads as one product" consistency rule.
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import AdvikaProductCard from '@/components/Product/AdvikaProductCard';
import { useDebouncedValue } from '@/features/products/hooks/useDebouncedValue';
import {
  useProductSearch,
  STATUS_LOADING,
  STATUS_LOADING_MORE,
  STATUS_SUCCESS,
  STATUS_EMPTY,
  STATUS_ERROR,
  STATUS_IDLE,
} from '@/features/products/hooks/useProductSearch';

const SKELETON_COUNT = 6;
const DEBOUNCE_MS = 400;

export default function SearchResultsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(urlQuery);
  const debouncedValue = useDebouncedValue(inputValue, DEBOUNCE_MS);
  const inputRef = useRef(null);

  // Back/forward navigation or an external link changing `q` should
  // update the visible input too (but don't fight the user mid-type: if
  // the URL was set by our own debounced-sync effect below, this is a
  // no-op since the values already match).
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  // Keep the URL in sync with the debounced value so the current search
  // is shareable/bookmarkable and survives a refresh, without spamming
  // browser history on every keystroke.
  useEffect(() => {
    const trimmed = debouncedValue.trim();
    if (trimmed === urlQuery) return;
    if (trimmed) setSearchParams({ q: trimmed }, { replace: true });
    else setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  const { status, items, hasMore, loadMore, retry } = useProductSearch(debouncedValue.trim());

  const handleClear = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="aa-shell min-h-screen bg-white">
      {/* Query-driven, unbounded in number, and largely duplicates content
          already indexable via /products or the product pages themselves —
          noindex so it doesn't compete with the canonical listing/product
          pages, while `follow` still lets crawlers reach the product links
          inside. */}
      <Seo
        title={urlQuery ? t('search.seoTitleWithQuery', 'Search results for "{{query}}"', { query: urlQuery }) : t('search.title', 'Search Products')}
        noindex
      />
      <AdvikaHeader />

      <main id="main-content" tabIndex={-1}>
        {/* Title block */}
        <div className="flex flex-col gap-[14px] bg-advika-near-black px-4 pb-[18px] pt-[22px]">
          <h1 className="aa-title-md text-white">{t('search.title', 'Search Products')}</h1>
          <div className="flex h-[46px] items-center gap-2 rounded border border-[#333] bg-advika-panel px-[13px]">
            <Icon name="search" size={19} className="text-advika-grey700" />
            <input
              ref={inputRef}
              type="search"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('search.placeholder', 'Search for truck, tempo, tractor parts…')}
              className="w-full bg-transparent text-[13.5px] text-white placeholder-advika-grey700 outline-none"
              aria-label={t('search.title', 'Search Products')}
            />
            {inputValue && (
              <button type="button" onClick={handleClear} aria-label={t('search.clear', 'Clear search')} className="shrink-0 text-advika-grey600">
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-[14px] pt-[14px]">
          {status === STATUS_IDLE && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Icon name="search" size={40} className="text-advika-grey600" />
              <p className="text-[13.5px] text-advika-grey800">{t('search.idle', 'Start typing to find products.')}</p>
            </div>
          )}

          {status === STATUS_LOADING && (
            <div className="grid grid-cols-2 gap-3" aria-busy="true">
              <span className="sr-only" role="status">{t('search.title', 'Search Products')}…</span>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className="skeleton aspect-[3/4]" aria-hidden="true" />
              ))}
            </div>
          )}

          {status === STATUS_ERROR && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center" role="alert">
              <Icon name="error" size={40} className="text-advika-grey600" />
              <p className="text-advika-grey800">{t('search.error', 'Something went wrong while searching.')}</p>
              <button type="button" onClick={retry} className="h-11 border-[1.5px] border-advika-chrome px-6 text-[13px] font-bold">
                {t('search.retry', 'Try Again')}
              </button>
            </div>
          )}

          {status === STATUS_EMPTY && (
            <div className="flex flex-col items-center gap-[15px] px-6 py-12 text-center">
              <span className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#e9e7e3]">
                <Icon name="search_off" size={38} className="text-advika-grey600" />
              </span>
              <h2 className="font-archivoBlack text-[20px] text-advika-chrome">{t('search.noResultsTitle', 'No products found')}</h2>
              <p className="max-w-[290px] text-[13.5px] text-advika-grey800">
                {t('search.noResultsHint', 'Try a different word, or search by vehicle type — truck, tempo, pickup, car, two-wheeler, or tractor.')}
              </p>
            </div>
          )}

          {(status === STATUS_SUCCESS || status === STATUS_LOADING_MORE) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {items.map((product) => (
                  <AdvikaProductCard key={product.id} product={product} imageHeight={118} dense />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center py-6">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={status === STATUS_LOADING_MORE}
                    className="border-[1.5px] border-advika-chrome px-8 py-3 text-[13px] font-bold disabled:opacity-50"
                  >
                    {status === STATUS_LOADING_MORE ? t('search.loadingMore', 'Loading…') : t('search.loadMore', 'Load More')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <AdvikaFooter />
      </main>
    </div>
  );
}
