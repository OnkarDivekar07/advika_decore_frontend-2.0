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
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n/index';
import * as cartService from '@/services/cartService';
import { isCartConflictError } from '@/services/cartService';
import { getProductsByIds } from '@/services/productsService';
import {
  getCartFromLocalStorage,
  updateCartToLocalStorage,
  clearCartFromLocalStorage,
  markGuestCartMerged,
  isGuestCartMergePending,
  clearGuestCartMergeMarker,
  getBuyNowItem,
  setBuyNowItem,
  clearBuyNowItem,
} from '@/features/cart/cartUtils';
import { handleError } from '@/utils/errorHandler';
import { usePricing } from '@/contexts/PricingContext';
import { MAX_CART_QUANTITY } from '@/config/cartLimits';

const CartContext = createContext(null);

// How long a burst of rapid +/- taps on the same line item is allowed to
// run before the (coalesced) result is actually sent to the backend. Every
// tap within the window resets the timer and overwrites what will be sent;
// only the last one in a burst ever reaches the network. Keeps a fast
// double/triple-tap from firing one PUT per click (each a redundant network
// round trip, and each a chance to race a stock check against the others).
const QUANTITY_DEBOUNCE_MS = 400;

// Backend cart rows come back as { productId, quantity, product: {...} }.
// Normalize both shapes (guest localStorage rows and backend rows) into
// one flat shape the UI already expects (CartItem/CartSummary use
// item.id/name/price/quantity/image), plus `stock` so quantity controls
// can enforce a ceiling client-side instead of only finding out via a
// failed request.
const fromBackendRow = (row) => ({
  id: row.productId,
  name: row.product?.name ?? 'Item',
  price: row.product?.price ?? 0,
  quantity: row.quantity,
  image: row.product?.images?.[0] || '',
  stock: typeof row.product?.stock === 'number' ? row.product.stock : null,
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
  // Backend-configured delivery rule (see PricingContext.jsx) — used only
  // in the guest-cart fallback branch of `summary` below, same role
  // config/pricing.js's calculateDeliveryCharge used to play directly.
  const { calculateDeliveryCharge } = usePricing();
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('guest'); // 'guest' | 'backend'
  // Starts true (not false): AuthContext's `isRestoring` is also true on
  // first render and only flips after an effect runs post-paint. The
  // cart-sync effect below is itself gated on `isRestoring`, so without
  // this the very first render would show isSyncing=false with items=[]
  // — i.e. CartPage briefly renders "Your cart is empty" for a returning
  // logged-in user before restoration even resolves. Staying true here
  // until the guest/backend branch actually runs closes that window.
  const [isSyncing, setIsSyncing] = useState(true);
  // True when the initial guest->backend sync / backend cart load failed
  // outright (network error, 5xx, etc.) — as opposed to a single mutation
  // failing. Without this the user was left staring at what looked like
  // an empty cart forever: `mode` never flips to 'backend' on failure, so
  // the empty-cart branch renders with no indication anything went wrong
  // and no way to retry short of a full page reload. See retryLoadCart.
  const [loadError, setLoadError] = useState(false);
  // The backend's own subtotal/deliveryCharge/total for the signed-in
  // cart (see cart.controller.js's `meta.summary`, returned by every
  // cartService call below). This — not a client-side recomputation — is
  // the source of truth for an authenticated cart's totals; it's only
  // ever set from a real API response, never derived locally, so it can't
  // drift from what checkout will actually charge. Null until the first
  // backend response comes back (see `summary` below for the fallback
  // used until then, and for guest mode, which has no backend cart to
  // ask).
  const [backendSummary, setBackendSummary] = useState(null);
  const [buyNowItem, setBuyNowItemState] = useState(() => getBuyNowItem());
  // --- Discount / coupon placeholder architecture ---------------------------
  // Preview-only, never persisted: the backend has no coupon system yet
  // (see cartService.previewCoupon), so `coupon` here just tracks the last
  // attempt so CartSummary can show a discount line / error without every
  // consumer re-deriving that itself. Cleared on any cart mutation (below)
  // rather than silently carried forward — a discount computed against a
  // subtotal that no longer exists isn't a "final payable amount" the user
  // should be shown, it's stale data.
  const [coupon, setCoupon] = useState({
    code: null,
    discount: 0,
    status: 'idle', // 'idle' | 'applying' | 'applied' | 'error'
    error: null,
  });
  // Guards against the guest->backend merge running twice (e.g. React
  // StrictMode double-invoking effects, or rapid auth state churn).
  const syncInFlight = useRef(false);
  // Guest carts otherwise never get their price/stock refreshed after the
  // item was first added — see revalidateGuestCart below. Guarded the same
  // way as syncInFlight so StrictMode's double-effect can't fire it twice.
  const guestRevalidationRan = useRef(false);

  // --- Quantity-change debouncing (see updateQuantity below) ---------------
  // Per-item-id maps, keyed by refs (not state) since they're bookkeeping
  // for in-flight network coalescing, not anything the UI renders directly.
  const quantityDebounceTimers = useRef(new Map()); // id -> setTimeout handle
  const pendingQuantity = useRef(new Map()); // id -> latest (clamped) quantity requested this burst
  const quantityBurstBaseline = useRef(new Map()); // id -> cart snapshot from before the burst started

  const clearPendingQuantityUpdate = useCallback((id) => {
    const timer = quantityDebounceTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      quantityDebounceTimers.current.delete(id);
    }
    pendingQuantity.current.delete(id);
    quantityBurstBaseline.current.delete(id);
  }, []);

  // Nothing should be left ticking after the provider unmounts.
  useEffect(() => {
    const timers = quantityDebounceTimers.current;
    const pending = pendingQuantity.current;
    const baselines = quantityBurstBaseline.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      pending.clear();
      baselines.clear();
    };
  }, []);

  // Load the backend cart fresh (no merge, no optimism) — used after the
  // one-time sync, and to reconcile in the background after a mutation.
  // Takes the summary straight from the response (see cartService.getCart)
  // rather than recomputing it from `rows` — same reasoning as everywhere
  // else in this file that touches `backendSummary`.
  const loadBackendCart = useCallback(async () => {
    const { items: rows, summary } = await cartService.getCart();
    setItems(rows.map(fromBackendRow));
    setBackendSummary(summary);
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

      if (isGuestCartMergePending()) {
        // A previous sync attempt already merged these guest items into the
        // backend cart but failed to clear localStorage afterwards. Merging
        // again here would double the quantities, so just retry the clear.
        if (clearCartFromLocalStorage()) {
          clearGuestCartMergeMarker();
        }
      } else if (guestItems.length > 0) {
        const { items: backendRows } = await cartService.getCart();
        const mergedPayload = mergeCartItems(backendRows, guestItems);
        if (mergedPayload.length > 0) {
          await cartService.saveCart(mergedPayload);
        }
        // Set the marker BEFORE attempting the clear: if the clear fails
        // (or throws), we still know the merge already succeeded server-side,
        // so a retried sync won't re-merge and duplicate quantities.
        markGuestCartMerged();
        if (clearCartFromLocalStorage()) {
          clearGuestCartMergeMarker();
        }
      }

      await loadBackendCart();
      setLoadError(false); // clears any error from a previous failed attempt
    } catch (error) {
      // Deliberately don't touch `items`/`mode` here: the guest cart in
      // localStorage (if any) is still intact and untouched, so nothing
      // has been lost — the user just can't see their backend cart yet.
      // `loadError` drives a dedicated retry UI in CartPage rather than
      // silently falling through to the (misleading) empty-cart state.
      setLoadError(true);
      handleError(error, 'Could not load your cart. Please try again.');
    } finally {
      setIsSyncing(false);
      syncInFlight.current = false;
    }
  }, [loadBackendCart]);

  // Exposed so CartPage's error state can offer a real "Try again" button
  // instead of telling the user to refresh the page.
  const retryLoadCart = useCallback(() => {
    syncInFlight.current = false; // allow a fresh attempt even right after a failed one
    return syncGuestCartToBackend();
  }, [syncGuestCartToBackend]);

  // Guest carts live entirely in localStorage with price/stock captured
  // once, at add-time — nothing ever refreshes them until login triggers
  // syncGuestCartToBackend. That's a real staleness window (a price change
  // or a product going out of stock/getting delisted while the guest is
  // still browsing), so the first time we land in guest mode with items
  // already in it, we revalidate everything against live product data in
  // one batched call. This gives guest carts the same price-consistency /
  // availability guarantee assertProductAvailable already gives backend
  // carts on every mutation — just applied once, eagerly, since there's no
  // per-mutation backend round trip to piggyback it on.
  const revalidateGuestCart = useCallback(async (currentItems) => {
    if (!currentItems || currentItems.length === 0) return;

    try {
      const liveProducts = await getProductsByIds(currentItems.map((item) => item.id));
      const byId = new Map(liveProducts.map((p) => [p.id, p]));

      let changed = false;
      const reconciled = [];
      for (const item of currentItems) {
        const live = byId.get(item.id);
        if (!live) {
          changed = true; // delisted/soft-deleted since it was added — drop it
          continue;
        }

        const stock = typeof live.stock === 'number' ? live.stock : null;
        const quantity =
          typeof stock === 'number' ? Math.min(item.quantity, Math.max(stock, 0)) : item.quantity;

        if (quantity < 1) {
          changed = true; // now out of stock entirely — drop it
          continue;
        }
        if (live.price !== item.price || quantity !== item.quantity || stock !== item.stock) {
          changed = true;
        }

        reconciled.push({
          ...item,
          name: live.name ?? item.name,
          price: live.price,
          image: live.images?.[0] || item.image,
          stock,
          quantity,
        });
      }

      if (changed) {
        setItems(reconciled);
        updateCartToLocalStorage(reconciled); // best-effort, same as other guest writes
        toast.info(
          i18n.t(
            'cart.guestRevalidated',
            "We've updated your cart to match current prices and availability."
          )
        );
      }
    } catch {
      // Best-effort only — a failed revalidation shouldn't block browsing.
      // Nothing here is authoritative anyway; the backend re-validates
      // everything for real once the guest cart is merged in at login.
    }
  }, []);

  // React to auth state settling/changing.
  useEffect(() => {
    if (isRestoring) return; // wait for AuthContext to know for sure

    if (isAuthenticated) {
      syncGuestCartToBackend();
    } else {
      // Logged out (or never logged in) — guest cart from localStorage.
      const guestItems = getCartFromLocalStorage();
      setItems(guestItems);
      setMode('guest');
      setBackendSummary(null); // stale backend total from a previous session shouldn't leak into the guest-mode fallback below
      setIsSyncing(false); // resolves the initial loading window — see useState(true) above
      setLoadError(false); // stale error from a previous authenticated session shouldn't linger

      if (!guestRevalidationRan.current) {
        guestRevalidationRan.current = true;
        revalidateGuestCart(guestItems);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isRestoring]);

  // Background reconciliation after an optimistic mutation succeeds —
  // catches server-side truth (price changes, stock adjustments) without
  // blocking the UI that already updated. Swallows errors deliberately:
  // the optimistic state is still correct-enough, and the mutation call
  // itself already surfaced any real failure to the user.
  //
  // Defined here (before its first use below) because the focus/visibility
  // effect that follows depends on it — declaring it after that effect
  // caused a "Cannot access 'reconcileInBackground' before initialization"
  // error, since the effect's dependency array is evaluated on every render
  // in source order, not after all hooks have run.
  const reconcileInBackground = useCallback(() => {
    cartService
      .getCart()
      .then(({ items: rows, summary }) => {
        setItems(rows.map(fromBackendRow));
        setBackendSummary(summary);
      })
      .catch(() => {});
  }, []);

  // --- Better cart synchronization ---------------------------------------
  // Backend mode: a signed-in shopper can easily have the cart open in two
  // tabs, or add/remove something on another device (or in the same tab,
  // an admin/stock change lands mid-session). Re-pulling the authoritative
  // cart (items + summary) whenever the tab regains focus/visibility keeps
  // both in sync with the backend without the user having to notice
  // anything is stale and manually reload. Best-effort, same as
  // reconcileInBackground: a failed background refresh shouldn't disrupt
  // whatever's already on screen.
  useEffect(() => {
    if (mode !== 'backend') return undefined;

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return;
      reconcileInBackground();
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [mode, reconcileInBackground]);

  // Guest mode: the cart lives in localStorage, which is shared across
  // every tab for this origin but not otherwise synchronized between
  // them — without this, adding/removing an item in one tab leaves every
  // other open tab showing a stale snapshot until it's reloaded. The
  // `storage` event fires in *other* tabs (never the one that made the
  // write), so there's no risk of this feeding back into a loop with the
  // guest-mode mutations above.
  useEffect(() => {
    if (mode !== 'guest') return undefined;

    const onStorage = (event) => {
      if (event.key !== 'cart') return;
      setItems(getCartFromLocalStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mode]);

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
        const stock = typeof product.stock === 'number' ? product.stock : existing?.stock ?? null;
        const optimistic = existing
          ? items.map((i) => (i.id === product.id ? { ...i, quantity: nextQuantity, stock } : i))
          : [
              ...items,
              {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity,
                image: product.images?.[0] || '',
                stock,
              },
            ];
        setItems(optimistic);
        try {
          const { summary } = await cartService.updateCartItem(product.id, nextQuantity);
          // Adopt the backend's post-write summary immediately — it's
          // already correct as of this response, no need to wait on the
          // background reconcile below (which re-syncs `items` for
          // price/stock drift but would otherwise leave the total stale
          // until it resolves).
          setBackendSummary(summary);
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
      const current = getCartFromLocalStorage(); // already normalized — see cartUtils
      const existingIndex = current.findIndex((i) => i.id === product.id);
      const existing = existingIndex >= 0 ? current[existingIndex] : null;
      const requestedQuantity = (existing?.quantity || 0) + quantity;

      // Same ceiling the backend branch above enforces: clamp to known
      // stock (nothing to check it against server-side until login syncs
      // this cart), then to MAX_CART_QUANTITY as a sanity cap either way.
      // Without this, a guest cart could quietly accumulate a quantity
      // the backend is guaranteed to reject the moment they sign in.
      const stock = typeof product.stock === 'number' ? product.stock : existing?.stock ?? null;
      const hasKnownStock = typeof stock === 'number';
      const stockClamped = hasKnownStock
        ? Math.min(requestedQuantity, Math.max(stock, 0))
        : requestedQuantity;
      const nextQuantity = Math.min(stockClamped, MAX_CART_QUANTITY);

      if (hasKnownStock && requestedQuantity > stock) {
        toast.info(
          i18n.t('cart.stockLimitReached', 'Only {{count}} left in stock.', { count: stock })
        );
      }
      if (nextQuantity < 1) {
        // Stock ceiling clamped this to nothing worth keeping — e.g. the
        // item is already in the cart at the full available quantity and
        // the product itself reports 0 stock.
        toast.error(i18n.t('cart.outOfStock', 'Out of stock'));
        return;
      }

      const updated = [...current];
      if (existingIndex >= 0) {
        updated[existingIndex] = { ...updated[existingIndex], quantity: nextQuantity, stock };
      } else {
        updated.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: nextQuantity,
          image: product.images?.[0] || '',
          stock,
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
      // Cancel any in-flight quantity-change burst for this item — without
      // this, a pending debounced PUT could fire after the DELETE and
      // silently resurrect the item the user just removed.
      clearPendingQuantityUpdate(id);

      const previous = items;

      if (mode === 'backend') {
        setItems(items.filter((item) => item.id !== id)); // optimistic
        try {
          const { summary } = await cartService.removeFromCart(id);
          setBackendSummary(summary);
          reconcileInBackground();
        } catch (error) {
          await recoverFromMutationError(error, previous, 'Could not remove item.');
        }
        return;
      }

      const updated = items.filter((item) => item.id !== id);
      // Persist first, then let the write's own outcome decide what the
      // UI shows — not the other way around. A silent write failure here
      // (quota exceeded, private browsing) would otherwise leave `items`
      // saying the item is gone while storage still has it, so the next
      // reload (or tab, or login-merge) resurrects something the user
      // already removed. updateCartToLocalStorage already surfaces the
      // underlying error via handleError; this just keeps in-memory
      // state from lying about what actually got saved.
      const ok = updateCartToLocalStorage(updated);
      setItems(ok ? updated : previous);
    },
    [mode, items, reconcileInBackground, recoverFromMutationError, clearPendingQuantityUpdate]
  );

  // Sends the debounced quantity to the backend once a burst of +/- taps on
  // one line item settles. Reads from refs (not React state) so it always
  // acts on the *last* value requested during the burst, and rolls back to
  // the snapshot from *before* the burst started on failure — not to some
  // intermediate optimistic value that was never actually confirmed.
  const flushQuantityUpdate = useCallback(
    async (id) => {
      const quantity = pendingQuantity.current.get(id);
      const previous = quantityBurstBaseline.current.get(id);
      pendingQuantity.current.delete(id);
      quantityBurstBaseline.current.delete(id);
      if (quantity == null) return;

      try {
        const { summary } = await cartService.updateCartItem(id, quantity);
        setBackendSummary(summary);
        reconcileInBackground();
      } catch (error) {
        await recoverFromMutationError(error, previous ?? [], 'Could not update quantity.');
      }
    },
    [reconcileInBackground, recoverFromMutationError]
  );

  const updateQuantity = useCallback(
    (id, quantity) => {
      // Dropping to zero/negative is a removal, not a no-op — matches
      // what a user tapping "-" past 1 would actually expect.
      if (quantity < 1) {
        removeItem(id);
        return;
      }

      if (mode === 'backend') {
        const target = items.find((item) => item.id === id);
        if (!target) return;

        // Clamp to known stock so a fast tap-spam can't even optimistically
        // show a quantity the backend is guaranteed to reject. The real
        // ceiling is still enforced server-side too (stock can change
        // between page load and this tap) — this just avoids a doomed
        // request and the confusing flash-then-revert that would follow.
        const hasKnownStock = typeof target.stock === 'number';
        const clamped = hasKnownStock ? Math.min(quantity, Math.max(target.stock, 0)) : quantity;

        if (hasKnownStock && quantity > target.stock) {
          toast.info(
            i18n.t('cart.stockLimitReached', 'Only {{count}} left in stock.', {
              count: target.stock,
            })
          );
        }
        if (clamped < 1) return; // nothing left to actually set
        if (clamped === target.quantity) return; // e.g. repeated taps at the stock ceiling — nothing to send

        // Snapshot the pre-burst state exactly once per burst (on its first
        // tap) so a later rollback always lands on what was last confirmed.
        if (!quantityBurstBaseline.current.has(id)) {
          quantityBurstBaseline.current.set(id, items);
        }
        pendingQuantity.current.set(id, clamped);
        setItems(items.map((item) => (item.id === id ? { ...item, quantity: clamped } : item)));

        const existingTimer = quantityDebounceTimers.current.get(id);
        if (existingTimer) clearTimeout(existingTimer);
        const timer = setTimeout(() => {
          quantityDebounceTimers.current.delete(id);
          flushQuantityUpdate(id);
        }, QUANTITY_DEBOUNCE_MS);
        quantityDebounceTimers.current.set(id, timer);
        return;
      }

      // Guest mode — mirror the backend branch's clamping so a fast
      // tap-spam can't push a guest cart's quantity past known stock or
      // past MAX_CART_QUANTITY; there's no server round trip here to
      // catch it later, so this IS the enforcement for guest carts.
      const target = items.find((item) => item.id === id);
      if (!target) return;

      const hasKnownStock = typeof target.stock === 'number';
      const stockClamped = hasKnownStock
        ? Math.min(quantity, Math.max(target.stock, 0))
        : quantity;
      const clamped = Math.min(stockClamped, MAX_CART_QUANTITY);

      if (hasKnownStock && quantity > target.stock) {
        toast.info(
          i18n.t('cart.stockLimitReached', 'Only {{count}} left in stock.', {
            count: target.stock,
          })
        );
      }
      if (clamped < 1) {
        removeItem(id); // stock dropped to 0 since this item was added
        return;
      }
      if (clamped === target.quantity) return; // e.g. repeated taps at the ceiling — nothing to send

      const previous = items;
      const updated = items.map((item) => (item.id === id ? { ...item, quantity: clamped } : item));
      // Same persist-then-reflect ordering as removeItem above — an
      // in-memory quantity that silently failed to save would otherwise
      // revert on the next reload without any indication why.
      const ok = updateCartToLocalStorage(updated);
      setItems(ok ? updated : previous);
    },
    [mode, items, removeItem, flushQuantityUpdate]
  );

  const clearCoupon = useCallback(() => {
    setCoupon({ code: null, discount: 0, status: 'idle', error: null });
  }, []);

  // A coupon preview is only valid for the subtotal it was computed
  // against — once the cart itself changes (add/remove/quantity, sync,
  // background reconciliation), that preview is stale and showing it as
  // the "final payable amount" would be wrong. Clearing here (rather than
  // in every individual mutation branch above) catches all of them,
  // including the ones that update `items` via background reconciliation
  // rather than directly.
  const itemsChangedSinceMount = useRef(false);
  useEffect(() => {
    if (!itemsChangedSinceMount.current) {
      itemsChangedSinceMount.current = true;
      return;
    }
    clearCoupon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Preview-only — see cartService.previewCoupon. Applies against whatever
  // is in the cart right now; the code is re-validated for real (against
  // whatever the cart actually is by then) at checkout.
  const applyCoupon = useCallback(async (code) => {
    if (!code || !code.trim()) return;
    setCoupon({ code, discount: 0, status: 'applying', error: null });
    try {
      const result = await cartService.previewCoupon(code.trim());
      setCoupon({ code: result.couponCode, discount: result.discount, status: 'applied', error: null });
    } catch (error) {
      const message = cartService.isInvalidCouponError(error)
        ? i18n.t('cart.invalidCoupon', 'That coupon code is invalid or has expired.')
        : i18n.t('cart.couponCheckFailed', "Couldn't check that coupon right now. Please try again.");
      setCoupon({ code: null, discount: 0, status: 'error', error: message });
    }
  }, []);

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

  // --- Cart summary (subtotal/deliveryCharge/total) ----------------------
  // Backend mode: the summary comes straight from the backend (see
  // `backendSummary` above / cart.controller.js's `meta.summary`) — the
  // single source of truth for what an authenticated cart's totals are,
  // never recomputed here. This is also why `calculateDeliveryCharge` is
  // pulled from usePricing() (PricingContext.jsx, itself fetched from
  // GET /api/shipping/delivery-config) at all: it's ONLY used in the
  // fallback branch below, for a cart the backend has no way to price —
  // an anonymous guest cart. Once that guest cart is merged in at login
  // (see syncGuestCartToBackend), this whole branch stops being consulted
  // for the rest of the session; the backend takes over entirely.
  const summary = useMemo(() => {
    if (mode === 'backend' && backendSummary) return backendSummary;
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const deliveryCharge = calculateDeliveryCharge(subtotal);
    return { subtotal, deliveryCharge, total: subtotal + deliveryCharge };
  }, [mode, backendSummary, items, calculateDeliveryCharge]);

  // What CartSummary should treat as the actual "final payable amount":
  // summary.total - discount, floored at 0 the same way the backend
  // floors it, with `coupon.discount` staying 0 until a real coupon system
  // exists to make it anything else (see cartService.previewCoupon).
  const total = useMemo(
    () => Math.max(0, summary.total - coupon.discount),
    [summary, coupon.discount]
  );
  const { subtotal, deliveryCharge } = summary;

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      deliveryCharge,
      total,
      coupon,
      applyCoupon,
      clearCoupon,
      isSyncing,
      loadError,
      retryLoadCart,
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
      deliveryCharge,
      total,
      coupon,
      applyCoupon,
      clearCoupon,
      isSyncing,
      loadError,
      retryLoadCart,
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
