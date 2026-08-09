// src/contexts/CartContext.jsx
//
// Single source of truth for the cart AND for "buy now" purchase intent,
// regardless of where either actually lives. Anonymous visitors get a
// cart in localStorage with zero backend calls — browsing and adding to
// cart never requires login. The moment AuthContext reports an
// authenticated user (i.e. right after OTP verify, triggered from the
// checkout gate), this context transparently merges whatever was in the
// guest cart into the backend cart via /api/cart and switches to
// reading/writing the backend from then on. Components never need to
// know which mode they're in — they just call useCart().
//
// Mutations are optimistic: the UI updates immediately and the API call
// happens in the background, with a rollback to the previous snapshot if
// it fails. This avoids a network round trip blocking every +/- tap.
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
import i18n from '@/i18n/index';
import * as cartService from '@/services/cartService';
import {
  getCartFromLocalStorage,
  updateCartToLocalStorage,
  clearCartFromLocalStorage,
  getBuyNowItem,
  setBuyNowItem,
  clearBuyNowItem,
} from '@/features/cart/cartUtils';
import { handleError } from '@/utils/errorHandler';

const CartContext = createContext(null);

// Backend cart rows come back as { productId, quantity, product: {...} }.
// Normalize both shapes (guest localStorage rows and backend rows) into
// one flat shape the UI already expects (CartItem/CartSummary use
// item.id/name/price/quantity/image).
const fromBackendRow = (row) => ({
  id: row.productId,
  name: row.product?.name ?? 'Item',
  price: row.product?.price ?? 0,
  quantity: row.quantity,
  image: row.product?.images?.[0] || '',
});

// Pure merge so it's easy to unit test / reason about independently of
// React state. Rule: quantities sum on conflict, whichever side (backend
// or guest) had a positive quantity wins the item, and anything that
// nets to zero/negative (shouldn't normally happen, but defensive) is
// dropped rather than sent to the backend as a bad payload.
// eslint-disable-next-line react-refresh/only-export-components -- exported separately for unit testing, not a component
export const mergeCartItems = (backendRows, guestItems) => {
  const merged = new Map(backendRows.map((row) => [row.productId, row.quantity]));
  for (const item of guestItems) {
    const current = merged.get(item.id) || 0;
    merged.set(item.id, current + item.quantity);
  }
  return Array.from(merged.entries())
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
};

export function CartProvider({ children }) {
  const { isAuthenticated, isRestoring } = useAuth();
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('guest'); // 'guest' | 'backend'
  const [isSyncing, setIsSyncing] = useState(false);
  const [buyNowItem, setBuyNowItemState] = useState(() => getBuyNowItem());
  // Guards against the guest->backend merge running twice (e.g. React
  // StrictMode double-invoking effects, or rapid auth state churn).
  const syncInFlight = useRef(false);

  // Load the backend cart fresh (no merge, no optimism) — used after the
  // one-time sync, and to reconcile in the background after a mutation.
  const loadBackendCart = useCallback(async () => {
    const rows = await cartService.getCart();
    setItems(rows.map(fromBackendRow));
    setMode('backend');
  }, []);

  // One-time reconciliation: fold any leftover guest-cart items into the
  // backend cart, then clear localStorage and switch to backend mode for
  // the rest of the session.
  const syncGuestCartToBackend = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setIsSyncing(true);
    try {
      const guestItems = getCartFromLocalStorage();
      const backendRows = await cartService.getCart();

      if (guestItems.length > 0) {
        const mergedPayload = mergeCartItems(backendRows, guestItems);
        if (mergedPayload.length > 0) {
          await cartService.saveCart(mergedPayload);
        }
        clearCartFromLocalStorage();
      }

      await loadBackendCart();
    } catch (error) {
      handleError(error, 'Could not sync your cart. Please try again.');
    } finally {
      setIsSyncing(false);
      syncInFlight.current = false;
    }
  }, [loadBackendCart]);

  // React to auth state settling/changing.
  useEffect(() => {
    if (isRestoring) return; // wait for AuthContext to know for sure

    if (isAuthenticated) {
      syncGuestCartToBackend();
    } else {
      // Logged out (or never logged in) — guest cart from localStorage.
      setItems(getCartFromLocalStorage());
      setMode('guest');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isRestoring]);

  // Background reconciliation after an optimistic mutation succeeds —
  // catches server-side truth (price changes, stock adjustments) without
  // blocking the UI that already updated. Swallows errors deliberately:
  // the optimistic state is still correct-enough, and the mutation call
  // itself already surfaced any real failure to the user.
  const reconcileInBackground = useCallback(() => {
    cartService.getCart().then((rows) => setItems(rows.map(fromBackendRow))).catch(() => {});
  }, []);

  // A failed mutation means either a plain request error (rollback to the
  // pre-optimistic snapshot is correct) or a stale-cart/stock conflict
  // (that snapshot is *also* stale, so rolling back to it would just show
  // the user another wrong state). For conflicts we instead reload the
  // authoritative cart from the server and say so, rather than silently
  // reverting to a number that was never right.
  const recoverFromMutationError = useCallback(
    async (error, previous, fallbackMessage) => {
      if (isCartConflictError(error)) {
        try {
          await loadBackendCart();
        } catch {
          // If even the resync fails, fall back to the pre-optimistic
          // snapshot so the UI isn't left showing the failed optimistic
          // state.
          setItems(previous);
        }
        handleError(
          error,
          i18n.t(
            'cart.staleConflict',
            "Some items in your cart changed — we've refreshed it to match what's actually available."
          )
        );
        return;
      }
      setItems(previous); // rollback
      handleError(error, fallbackMessage);
    },
    [loadBackendCart]
  );

  const addItem = useCallback(
    async (product, quantity = 1) => {
      const previous = items;

      if (mode === 'backend') {
        const existing = items.find((i) => i.id === product.id);
        const nextQuantity = (existing?.quantity || 0) + quantity;
        const optimistic = existing
          ? items.map((i) => (i.id === product.id ? { ...i, quantity: nextQuantity } : i))
          : [
              ...items,
              {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity,
                image: product.images?.[0] || '',
              },
            ];
        setItems(optimistic);
        try {
          await cartService.updateCartItem(product.id, nextQuantity);
          reconcileInBackground();
        } catch (error) {
          await recoverFromMutationError(error, previous, 'Could not add item to cart.');
          throw error;
        }
        return;
      }

      // Guest mode — localStorage only, no network call, so optimism is
      // moot: the write itself is instant. Still needs to report failure
      // (e.g. storage quota exceeded, private browsing) rather than let
      // the caller believe the add succeeded when nothing was persisted.
      const current = getCartFromLocalStorage();
      const existingIndex = current.findIndex((i) => i.id === product.id);
      const updated = [...current];
      if (existingIndex >= 0) {
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
      } else {
        updated.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.images?.[0] || '',
        });
      }
      const ok = updateCartToLocalStorage(updated);
      if (!ok) {
        throw new Error('Could not save your cart on this device.');
      }
      setItems(updated);
    },
    [mode, items, reconcileInBackground, recoverFromMutationError]
  );

  const removeItem = useCallback(
    async (id) => {
      const previous = items;

      if (mode === 'backend') {
        setItems(items.filter((item) => item.id !== id)); // optimistic
        try {
          await cartService.removeFromCart(id);
          reconcileInBackground();
        } catch (error) {
          await recoverFromMutationError(error, previous, 'Could not remove item.');
        }
        return;
      }

      const updated = items.filter((item) => item.id !== id);
      setItems(updated);
      updateCartToLocalStorage(updated); // best-effort; UI already reflects the removal
    },
    [mode, items, reconcileInBackground, recoverFromMutationError]
  );

  const updateQuantity = useCallback(
    async (id, quantity) => {
      // Dropping to zero/negative is a removal, not a no-op — matches
      // what a user tapping "-" past 1 would actually expect.
      if (quantity < 1) return removeItem(id);

      const previous = items;

      if (mode === 'backend') {
        setItems(items.map((item) => (item.id === id ? { ...item, quantity } : item))); // optimistic
        try {
          await cartService.updateCartItem(id, quantity);
          reconcileInBackground();
        } catch (error) {
          await recoverFromMutationError(error, previous, 'Could not update quantity.');
        }
        return;
      }

      const updated = items.map((item) => (item.id === id ? { ...item, quantity } : item));
      setItems(updated);
      updateCartToLocalStorage(updated);
    },
    [mode, items, reconcileInBackground, removeItem, recoverFromMutationError]
  );

  // "Buy Now" purchase intent — deliberately separate from the persistent
  // cart array (it shouldn't get merged/synced with it), but owned by
  // this same context so there's exactly one place that manages either
  // kind of cart-ish state instead of components reaching into
  // localStorage helpers directly.
  //
  // Returns whether the write actually succeeded (storage can fail —
  // quota exceeded, private-browsing restrictions, etc.) so a caller
  // like the Buy Now button can avoid navigating to checkout with a
  // stale or missing purchase intent.
  const setBuyNow = useCallback((product, quantity = 1) => {
    const wrote = setBuyNowItem(product, quantity);
    const stored = getBuyNowItem();
    // Confirm the item we just wrote is actually what's in storage now
    // (not, say, a stale item left over from a failed write), not just
    // that the write call itself didn't throw.
    const ok = wrote && stored?.id === product.id && stored?.quantity === quantity;
    setBuyNowItemState(stored);
    return ok;
  }, []);

  const clearBuyNow = useCallback(() => {
    clearBuyNowItem();
    setBuyNowItemState(null);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );
  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      isSyncing,
      isBackend: mode === 'backend',
      addItem,
      updateQuantity,
      removeItem,
      buyNowItem,
      setBuyNow,
      clearBuyNow,
    }),
    [
      items,
      itemCount,
      subtotal,
      isSyncing,
      mode,
      addItem,
      updateQuantity,
      removeItem,
      buyNowItem,
      setBuyNow,
      clearBuyNow,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- provider and hook are intentionally colocated
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
