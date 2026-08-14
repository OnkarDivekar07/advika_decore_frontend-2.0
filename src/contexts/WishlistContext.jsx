// src/contexts/WishlistContext.jsx
//
// Single source of truth for "is this product wishlisted?" across the
// app (ProductCard's heart overlay, ProductDetails' wishlist button, the
// Navbar's wishlist count badge, and WishlistPage all read from here).
//
// Mirrors CartContext's guest/backend architecture exactly, for the same
// reason: browsing and wishlisting a product should never require
// signing in (only checkout does — see AuthGateContext), so anonymous
// visitors get a wishlist in localStorage with zero backend calls. The
// moment AuthContext reports an authenticated user, this context merges
// whatever was in the guest wishlist into the backend wishlist via
// /api/wishlist and switches to reading/writing the backend from then
// on. Components never need to know which mode they're in — they just
// call useWishlist().
//
// Mutations are optimistic (toggle the heart immediately, roll back on
// failure), same as the cart's quantity taps.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as wishlistService from '@/services/wishlistService';
import { getProductsByIds } from '@/services/productsService';
import {
  getWishlistFromLocalStorage,
  updateWishlistToLocalStorage,
  clearWishlistFromLocalStorage,
  markGuestWishlistMerged,
  isGuestWishlistMergePending,
  clearGuestWishlistMergeMarker,
} from '@/features/wishlist/wishlistUtils';
import { handleError } from '@/utils/errorHandler';

const WishlistContext = createContext(null);

// Backend rows come back as { id, productId, product, createdAt }; guest
// rows are stored as { productId, product }. Normalized to the same
// shape here so every consumer (WishlistPage, the Navbar badge,
// isWishlisted) can treat both modes identically.
const fromBackendRow = (row) => ({ productId: row.productId, product: row.product });

export function WishlistProvider({ children }) {
  const { isAuthenticated, isRestoring } = useAuth();
  const [items, setItems] = useState([]); // normalized { productId, product }[]
  const [mode, setMode] = useState('guest'); // 'guest' | 'backend'
  // Starts true for the same reason CartContext's isSyncing does: avoids
  // a one-frame flash of "empty wishlist" for a returning signed-in user
  // before AuthContext's own restoration has resolved.
  const [isSyncing, setIsSyncing] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [mutatingIds, setMutatingIds] = useState(() => new Set());

  const syncInFlight = useRef(false);
  const guestRevalidationRan = useRef(false);

  const productIds = useMemo(() => new Set(items.map((item) => item.productId)), [items]);
  const isWishlisted = useCallback((productId) => productIds.has(productId), [productIds]);
  const count = items.length;

  const setMutating = useCallback((productId, isMutating) => {
    setMutatingIds((prev) => {
      const next = new Set(prev);
      if (isMutating) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  // Load the backend wishlist fresh — used after the one-time sync, and
  // exposed for WishlistPage's manual "Retry" affordance.
  const loadBackendWishlist = useCallback(async () => {
    const rows = await wishlistService.getWishlist();
    setItems(rows.map(fromBackendRow));
    setMode('backend');
  }, []);

  // One-time reconciliation: fold any leftover guest-wishlist items into
  // the backend wishlist, then clear localStorage and switch to backend
  // mode for the rest of the session. Structurally identical to
  // CartContext's syncGuestCartToBackend — see wishlistUtils.js's merge
  // marker for why the pending-clear retry branch exists.
  const syncGuestWishlistToBackend = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setIsSyncing(true);
    try {
      const guestItems = getWishlistFromLocalStorage();

      if (isGuestWishlistMergePending()) {
        // A previous attempt already merged these into the backend but
        // failed to clear localStorage — nothing left to merge, just
        // retry the clear and load what's already there.
        if (clearWishlistFromLocalStorage()) {
          clearGuestWishlistMergeMarker();
        }
        await loadBackendWishlist();
      } else if (guestItems.length > 0) {
        const backendRows = await wishlistService.getWishlist();
        const backendIds = new Set(backendRows.map((row) => row.productId));
        const toAdd = guestItems.filter((item) => !backendIds.has(item.productId));

        // No bulk-add endpoint on the backend (see wishlist.routes.js) —
        // a wishlist merge is small in practice (a handful of saved
        // items, not a cart's worth of line quantities), so one request
        // per new item is an acceptable trade-off against adding a bulk
        // endpoint the rest of the app has no other use for. Settled
        // (not all) so one already-deleted guest-side product can't
        // abort the merge of everything else.
        const results = await Promise.allSettled(
          toAdd.map((item) => wishlistService.addToWishlist(item.productId))
        );

        markGuestWishlistMerged();
        if (clearWishlistFromLocalStorage()) {
          clearGuestWishlistMergeMarker();
        }

        // Build the post-merge list from what's already in hand — the
        // GET above plus each successful add's own response — instead
        // of a second GET /api/wishlist. Every add response already
        // includes the row (with product) per wishlist.controller.js.
        const added = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => fromBackendRow(r.value));
        setItems([...added, ...backendRows.map(fromBackendRow)]);
        setMode('backend');
      } else {
        await loadBackendWishlist();
      }

      setLoadError(false);
    } catch (error) {
      // Same reasoning as the cart: don't touch `items`/`mode` here — the
      // guest wishlist in localStorage (if any) is still intact, so
      // nothing has been lost, the user just can't see the backend
      // wishlist yet. `loadError` drives WishlistPage's retry UI.
      setLoadError(true);
      handleError(error, "Couldn't load your wishlist. Please try again.");
    } finally {
      setIsSyncing(false);
      syncInFlight.current = false;
    }
  }, [loadBackendWishlist]);

  const retryLoad = useCallback(() => {
    syncInFlight.current = false;
    return syncGuestWishlistToBackend();
  }, [syncGuestWishlistToBackend]);

  // Guest wishlists live entirely in localStorage with a product
  // snapshot captured once, at add-time — nothing refreshes it until
  // login triggers the merge above. Same staleness window
  // CartContext's revalidateGuestCart closes for the guest cart: the
  // first time we land in guest mode with items already in it, refresh
  // every snapshot against live product data in one batched call. Unlike
  // the cart, a product going out of stock does NOT drop it here — an
  // out-of-stock item is still meaningful to have wishlisted (that's the
  // point of "save for later"); only a genuinely deleted/delisted
  // product is removed, matching what the backend's own getWishlist
  // already does server-side (see wishlist.service.js's orphan sweep).
  const revalidateGuestWishlist = useCallback(async (currentItems) => {
    if (!currentItems || currentItems.length === 0) return;

    try {
      const liveProducts = await getProductsByIds(currentItems.map((item) => item.productId));
      const byId = new Map(liveProducts.map((p) => [p.id, p]));

      let changed = false;
      const reconciled = [];
      for (const item of currentItems) {
        const live = byId.get(item.productId);
        if (!live) {
          changed = true; // delisted/soft-deleted since it was saved — drop it
          continue;
        }
        if (JSON.stringify(live) !== JSON.stringify(item.product)) changed = true;
        reconciled.push({ productId: item.productId, product: live });
      }

      if (changed) {
        setItems(reconciled);
        updateWishlistToLocalStorage(reconciled);
      }
    } catch {
      // Best-effort only, same as the cart's revalidation — a failed
      // refresh shouldn't block browsing, and the backend re-validates
      // everything for real once the guest wishlist is merged at login.
    }
  }, []);

  // React to auth state settling/changing.
  useEffect(() => {
    if (isRestoring) return;

    if (isAuthenticated) {
      syncGuestWishlistToBackend();
    } else {
      const guestItems = getWishlistFromLocalStorage();
      setItems(guestItems);
      setMode('guest');
      setIsSyncing(false);
      setLoadError(false);

      if (!guestRevalidationRan.current) {
        guestRevalidationRan.current = true;
        revalidateGuestWishlist(guestItems);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isRestoring]);

  // Cross-tab sync for guest mode — same reasoning as the cart's
  // `storage` listener: localStorage is shared across tabs for this
  // origin but doesn't otherwise notify other open tabs of a write.
  useEffect(() => {
    if (mode !== 'guest') return undefined;

    const onStorage = (event) => {
      if (event.key !== 'wishlist') return;
      setItems(getWishlistFromLocalStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mode]);

  const addItem = useCallback(
    async (product) => {
      const productId = product.id;
      if (isWishlisted(productId) || mutatingIds.has(productId)) return;

      const previous = items;
      setMutating(productId, true);
      setItems((prev) => [{ productId, product }, ...prev]);

      if (mode === 'guest') {
        updateWishlistToLocalStorage([{ productId, product }, ...previous]);
        setMutating(productId, false);
        return;
      }

      try {
        await wishlistService.addToWishlist(productId);
      } catch (error) {
        setItems(previous);
        handleError(error, "Couldn't add that to your wishlist.");
        throw error;
      } finally {
        setMutating(productId, false);
      }
    },
    [items, mode, isWishlisted, mutatingIds, setMutating]
  );

  const removeItem = useCallback(
    async (productId) => {
      if (mutatingIds.has(productId)) return;

      const previous = items;
      setMutating(productId, true);
      const next = previous.filter((item) => item.productId !== productId);
      setItems(next);

      if (mode === 'guest') {
        updateWishlistToLocalStorage(next);
        setMutating(productId, false);
        return;
      }

      try {
        await wishlistService.removeFromWishlist(productId);
      } catch (error) {
        setItems(previous);
        handleError(error, "Couldn't remove that from your wishlist.");
        throw error;
      } finally {
        setMutating(productId, false);
      }
    },
    [items, mode, mutatingIds, setMutating]
  );

  const toggle = useCallback(
    async (product) => {
      if (isWishlisted(product.id)) {
        await removeItem(product.id);
      } else {
        await addItem(product);
      }
    },
    [isWishlisted, addItem, removeItem]
  );

  return (
    <WishlistContext.Provider
      value={{
        items,
        mode,
        isSyncing,
        loadError,
        retryLoad,
        count,
        isWishlisted,
        addItem,
        removeItem,
        toggle,
        mutatingIds,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- provider and hook are intentionally colocated
export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
