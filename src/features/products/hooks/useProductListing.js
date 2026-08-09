// src/features/products/hooks/useProductListing.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProducts } from '@/services/productsService';
import { handleError } from '@/utils/errorHandler';

export const PAGE_SIZE = 12;

export const STATUS_LOADING = 'loading';
export const STATUS_LOADING_MORE = 'loading-more';
export const STATUS_SUCCESS = 'success';
export const STATUS_EMPTY = 'empty';
export const STATUS_ERROR = 'error';

/**
 * Drives the product listing page.
 *
 * `filters` should be a stable, plain object (category/minPrice/maxPrice/
 * inStock/sort/order) — it's serialized to detect real changes vs. a new
 * object with the same values on every render. `page` is the number of
 * pages the caller wants loaded (1 = first page only, 2 = first two
 * pages concatenated, etc.) — the same shape SearchResultsPage's
 * "Load More" uses, just externally driven so it can be kept in the URL.
 *
 * Requests are minimized on purpose:
 * - Changing filters resets and (re)fetches from page 1.
 * - Increasing `page` (Load More, or the URL already asking for page N
 *   on first mount/refresh) fetches only the *missing* pages, not the
 *   ones already in memory.
 * - Decreasing `page` (browser Back after Load More) never refetches —
 *   it just re-slices the products already held in memory.
 */
export function useProductListing(filters, page) {
  const [status, setStatus] = useState(STATUS_LOADING);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const filterKey = JSON.stringify(filters ?? {});
  const prevFilterKeyRef = useRef(null);
  const loadedItemsRef = useRef([]);
  const loadedPageRef = useRef(0);
  const lastMetaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const filtersChanged = prevFilterKeyRef.current !== filterKey;
    prevFilterKeyRef.current = filterKey;
    const targetPage = Math.max(1, page || 1);

    // Already have everything we need in memory — just render a slice,
    // no network request at all (this is what makes Back instant/free).
    if (!filtersChanged && targetPage <= loadedPageRef.current) {
      setItems(loadedItemsRef.current.slice(0, targetPage * PAGE_SIZE));
      setMeta(lastMetaRef.current);
      setStatus(loadedItemsRef.current.length > 0 ? STATUS_SUCCESS : STATUS_EMPTY);
      return undefined;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    if (filtersChanged) {
      loadedItemsRef.current = [];
      loadedPageRef.current = 0;
      lastMetaRef.current = null;
      setItems([]);
      setMeta(null);
      setStatus(STATUS_LOADING);
    } else {
      setStatus(STATUS_LOADING_MORE);
    }

    const startPage = filtersChanged ? 1 : loadedPageRef.current + 1;

    (async () => {
      try {
        for (let p = startPage; p <= targetPage; p++) {
          const res = await fetchProducts({
            ...filters,
            page: p,
            limit: PAGE_SIZE,
            signal: controller.signal,
          });
          if (requestId !== requestIdRef.current) return; // superseded

          loadedItemsRef.current = [...loadedItemsRef.current, ...(res.items ?? [])];
          loadedPageRef.current = p;
          lastMetaRef.current = res.meta ?? null;

          const totalPages = res.meta?.totalPages ?? p;
          if (p >= totalPages) break; // nothing further to fetch even if targetPage asked for more
        }

        if (requestId !== requestIdRef.current) return;
        setItems(loadedItemsRef.current);
        setMeta(lastMetaRef.current);
        setStatus(loadedItemsRef.current.length > 0 ? STATUS_SUCCESS : STATUS_EMPTY);
      } catch (err) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        if (requestId === requestIdRef.current) {
          setStatus(STATUS_ERROR);
          handleError(err, 'Could not load products.');
        }
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, retryNonce]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  const hasMore = !!lastMetaRef.current && loadedPageRef.current < (lastMetaRef.current.totalPages ?? 0);

  return { status, items, meta, hasMore, retry };
}
