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
          setItems(previous); // rollback
          handleError(error, 'Could not add item to cart.');
          throw error;
        }
        return;
      }

      // Guest mode — localStorage only, no network call, so optimism is
      // moot: the write itself is instant.
      const current = getCartFromLocalStorage();
      const existingIndex = current.findIndex((i) => i.id === product.id);
      if (existingIndex >= 0) {
        current[existingIndex].quantity += quantity;
      } else {
        current.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.images?.[0] || '',
        });
      }
      updateCartToLocalStorage(current);
      setItems(current);
    },
    [mode, items, reconcileInBackground]
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
          setItems(previous); // rollback
          handleError(error, 'Could not remove item.');
        }
        return;
      }

      const updated = items.filter((item) => item.id !== id);
      setItems(updated);
      updateCartToLocalStorage(updated);
    },
    [mode, items, reconcileInBackground]
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
          setItems(previous); // rollback
          handleError(error, 'Could not update quantity.');
        }
        return;
      }

      const updated = items.map((item) => (item.id === id ? { ...item, quantity } : item));
      setItems(updated);
      updateCartToLocalStorage(updated);
    },
    [mode, items, reconcileInBackground, removeItem]
  );

  // "Buy Now" purchase intent — deliberately separate from the persistent
  // cart array (it shouldn't get merged/synced with it), but owned by
  // this same context so there's exactly one place that manages either
  // kind of cart-ish state instead of components reaching into
  // localStorage helpers directly.
  const setBuyNow = useCallback((product, quantity = 1) => {
    setBuyNowItem(product, quantity);
    setBuyNowItemState(getBuyNowItem());
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

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
