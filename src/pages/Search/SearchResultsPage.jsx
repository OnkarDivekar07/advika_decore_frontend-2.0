// src/pages/Search/SearchResultsPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import ProductCard from '@/components/Product/ProductCard';
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

const SKELETON_COUNT = 8;
const DEBOUNCE_MS = 400;

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5" aria-busy="true">
      <span className="sr-only" role="status">Searching…</span>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="skeleton aspect-[3/4]" aria-hidden="true" />
      ))}
    </div>
  );
}

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
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10" id="main-content" tabIndex={-1}>
        {/* Search box */}
        <div className="mb-7">
          <h1 className="section-title mb-4">{t('search.title', 'Search Products')}</h1>
          <div className="flex items-center gap-2 rounded-full border-2 border-gray-200 focus-within:border-primary bg-white px-4 py-3 max-w-xl transition-colors">
            <FiSearch className="text-gray-500 shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('search.placeholder', 'Search for truck, tempo, tractor parts…')}
              className="flex-1 bg-transparent outline-none text-sm sm:text-base text-gray-800 placeholder-gray-400"
              aria-label={t('search.title', 'Search Products')}
            />
            {inputValue && (
              <button
                onClick={handleClear}
                aria-label={t('search.clear', 'Clear search')}
                className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {status === STATUS_IDLE && (
          <div className="flex flex-col items-center text-center gap-3 py-20 text-gray-500">
            <FiSearch className="w-12 h-12" aria-hidden />
            <p className="text-sm">{t('search.idle', 'Start typing to find products.')}</p>
          </div>
        )}

        {status === STATUS_LOADING && <ResultsSkeleton />}

        {status === STATUS_ERROR && (
          <div className="flex flex-col items-center text-center gap-3 py-20" role="alert">
            <FiAlertCircle className="w-12 h-12 text-red-400" aria-hidden />
            <p className="text-gray-600">{t('search.error', 'Something went wrong while searching.')}</p>
            <button onClick={retry} className="btn btn-outline mt-1">
              <FiRefreshCw className="w-4 h-4" aria-hidden />
              {t('search.retry', 'Try Again')}
            </button>
          </div>
        )}

        {status === STATUS_EMPTY && (
          <div className="flex flex-col items-center text-center gap-3 py-20">
            <FiSearch className="w-12 h-12 text-gray-300" aria-hidden />
            <h2 className="text-lg font-semibold text-gray-700">
              {t('search.noResultsTitle', 'No products found')}
            </h2>
            <p className="text-gray-500 max-w-sm">
              {t('search.noResultsHint', 'Try a different word, or search by vehicle type — truck, tempo, pickup, car, two-wheeler, or tractor.')}
            </p>
          </div>
        )}

        {(status === STATUS_SUCCESS || status === STATUS_LOADING_MORE) && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
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
      </main>
    </>
  );
}
