// src/features/products/hooks/useProductSearch.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchProducts } from '@/services/productsService';
import { buildSearchCandidates } from '../utils/searchTermTranslation';
import { handleError } from '@/utils/errorHandler';

const PAGE_SIZE = 12;

export const STATUS_IDLE = 'idle';
export const STATUS_LOADING = 'loading';
export const STATUS_LOADING_MORE = 'loading-more';
export const STATUS_SUCCESS = 'success';
export const STATUS_EMPTY = 'empty';
export const STATUS_ERROR = 'error';

/**
 * Runs a product search for `query` (expected to already be debounced by
 * the caller) and exposes the state needed to render loading / results /
 * no-results / error UI, plus a `loadMore` for pagination.
 *
 * Tries `buildSearchCandidates(query)` in order and stops at the first
 * candidate that returns any results, so a Hindi/Marathi category word
 * transparently falls through to its English translation without the
 * user seeing multiple round trips.
 *
 * @param {string} query - already-debounced search string
 */
export function useProductSearch(query) {
  const [status, setStatus] = useState(STATUS_IDLE);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);
  // The candidate query that actually produced results — kept separate
  // from the user's raw `query` so pagination re-requests the same term
  // that worked, without re-running translation guesswork each page.
  const matchedQueryRef = useRef(null);
  const abortControllerRef = useRef(null);
  // Guards against a slow, now-stale request's response landing after a
  // newer search has already started (belt-and-suspenders alongside the
  // AbortController itself).
  const requestIdRef = useRef(0);

  useEffect(() => {
    abortControllerRef.current?.abort();

    const trimmed = query.trim();
    if (!trimmed) {
      setStatus(STATUS_IDLE);
      setItems([]);
      setMeta(null);
      matchedQueryRef.current = null;
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus(STATUS_LOADING);

    (async () => {
      const candidates = buildSearchCandidates(trimmed);
      let result = null;
      let usedCandidate = trimmed;

      for (const candidate of candidates) {
        try {
          const attempt = await searchProducts({
            search: candidate,
            page: 1,
            limit: PAGE_SIZE,
            signal: controller.signal,
          });
          result = attempt;
          usedCandidate = candidate;
          if ((attempt.meta?.total ?? 0) > 0) break;
        } catch (err) {
          if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
          if (requestId === requestIdRef.current) {
            setStatus(STATUS_ERROR);
            handleError(err, 'Could not load search results.');
          }
          return;
        }
      }

      if (requestId !== requestIdRef.current) return; // superseded by a newer search

      matchedQueryRef.current = usedCandidate;
      setItems(result?.items ?? []);
      setMeta(result?.meta ?? null);
      setStatus((result?.meta?.total ?? 0) > 0 ? STATUS_SUCCESS : STATUS_EMPTY);
    })();

    return () => controller.abort();
  }, [query, retryNonce]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  const loadMore = useCallback(async () => {
    if (!meta || !matchedQueryRef.current) return;
    const nextPage = meta.page + 1;
    if (nextPage > meta.totalPages) return;

    setStatus(STATUS_LOADING_MORE);
    try {
      const attempt = await searchProducts({
        search: matchedQueryRef.current,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setItems((prev) => [...prev, ...attempt.items]);
      setMeta(attempt.meta);
      setStatus(STATUS_SUCCESS);
    } catch (err) {
      setStatus(STATUS_SUCCESS); // keep existing results visible
      handleError(err, 'Could not load more results.');
    }
  }, [meta]);

  const hasMore = !!meta && meta.page < meta.totalPages;

  return { status, items, meta, hasMore, loadMore, retry };
}
