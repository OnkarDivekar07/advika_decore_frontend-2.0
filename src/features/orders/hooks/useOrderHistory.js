// src/features/orders/hooks/useOrderHistory.js
//
// Drives the "My Orders" list (OrderListPage) against GET /api/order/history
// (orderService.getOrderHistory). Same shape as useProductListing (see
// features/products/hooks/useProductListing.js) so pagination behaves
// identically across the app: `page` is externally driven (from the URL,
// via OrderListPage's own ?page= param — see useSearchParams there) and
// means "how many pages of results are wanted in total" (1 = first page
// only, 2 = first two pages concatenated, etc.), not a single page to
// fetch. That's what makes "Load More" additive (only the missing page(s)
// are requested) and Back free (already-loaded pages are just re-sliced,
// no network request) — and, since the page count itself lives in the
// URL, a refresh or a shared/bookmarked link reproduces the exact same
// view.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as orderService from '@/services/orderService';
import { handleError } from '@/utils/errorHandler';

export const ORDER_HISTORY_PAGE_SIZE = 10;

export const STATUS_LOADING = 'loading';
export const STATUS_LOADING_MORE = 'loading-more';
export const STATUS_SUCCESS = 'success';
export const STATUS_EMPTY = 'empty';
export const STATUS_ERROR = 'error';

// `enabled` (default true, so OrderListPage's existing useOrderHistory(page)
// call is unaffected) lets a caller that isn't sure yet whether the visitor
// is even signed in — see UserProfilePage.jsx, which otherwise fired this
// on mount for a logged-out visitor and turned a plain "you're not signed
// in" into a confusing "session no longer valid" redirect — defer the fetch
// until it knows. Mirrors useProfile's/useAddressBook's own `autoLoad`.
export function useOrderHistory(page = 1, { enabled = true } = {}) {
  const [status, setStatus] = useState(STATUS_LOADING);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const loadedOrdersRef = useRef([]);
  const loadedPageRef = useRef(0);
  const lastMetaRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const targetPage = Math.max(1, page || 1);

    // Already have everything we need in memory (e.g. browser Back after
    // Load More) — just re-slice, no network request at all.
    if (targetPage <= loadedPageRef.current) {
      setOrders(loadedOrdersRef.current.slice(0, targetPage * ORDER_HISTORY_PAGE_SIZE));
      setMeta(lastMetaRef.current);
      setStatus(loadedOrdersRef.current.length > 0 ? STATUS_SUCCESS : STATUS_EMPTY);
      return;
    }

    const requestId = ++requestIdRef.current;
    const startPage = loadedPageRef.current + 1;
    setStatus(loadedPageRef.current > 0 ? STATUS_LOADING_MORE : STATUS_LOADING);

    (async () => {
      try {
        for (let p = startPage; p <= targetPage; p++) {
          const res = await orderService.getOrderHistory({ page: p, limit: ORDER_HISTORY_PAGE_SIZE });
          if (requestId !== requestIdRef.current) return; // superseded

          loadedOrdersRef.current = [...loadedOrdersRef.current, ...(res.orders ?? [])];
          loadedPageRef.current = p;
          lastMetaRef.current = res.meta ?? null;

          const totalPages = res.meta?.totalPages ?? p;
          if (p >= totalPages) break; // nothing further to fetch even if targetPage asked for more
        }

        if (requestId !== requestIdRef.current) return;
        setOrders(loadedOrdersRef.current);
        setMeta(lastMetaRef.current);
        setStatus(loadedOrdersRef.current.length > 0 ? STATUS_SUCCESS : STATUS_EMPTY);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setStatus(STATUS_ERROR);
          handleError(error, "Couldn't load your orders.");
        }
      }
    })();
  }, [page, retryNonce, enabled]);

  const retry = useCallback(() => {
    // A retry should re-fetch from page 1, not just re-request whatever
    // page the URL currently points at — a stale/partial in-memory cache
    // from a failed request shouldn't linger.
    loadedOrdersRef.current = [];
    loadedPageRef.current = 0;
    lastMetaRef.current = null;
    setRetryNonce((n) => n + 1);
  }, []);

  const hasMore = !!lastMetaRef.current && loadedPageRef.current < (lastMetaRef.current.totalPages ?? 0);

  return { status, orders, meta, hasMore, retry };
}
