// features/cart/utils/cartUtils.js
//
// Pure localStorage read/write primitives only — no cart mutation logic
// lives here. CartContext.jsx is the single place that decides how a cart
// item gets added/merged/quantity-changed (guest or backend mode); keeping
// that logic out of this file means there's exactly one implementation of
// "add to cart" to keep bulletproof, not two that can quietly drift apart.
import { handleError } from '@/utils/errorHandler';
import { MAX_CART_QUANTITY } from '@/config/cartLimits';

// --- Guest-cart normalization -----------------------------------------
// `localStorage` is plain, unvalidated JSON that anything can write to:
// a bug in an older build of this app, a browser extension, a user
// poking at devtools, or (mundanely) two tabs both racing an `addItem`
// against the same product before either one's write lands. Any of
// those can leave the stored array with more than one row for the same
// product id, a row with a corrupted/negative/non-numeric quantity, or
// a quantity that's stale against a stock ceiling that was known at the
// time it was written. None of that should ever reach the rest of the
// app as-is — this is the one place raw storage content gets turned
// into something the rest of the cart code can trust.
//
// Exported (not just used internally) so it's unit-testable on its own
// terms, independent of localStorage or React.
//
// @param {any} rawItems - whatever JSON.parse produced from storage
// @returns {Array<{id, name, price, quantity, image, stock}>}
export const normalizeGuestCartItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];

  // Merge duplicate rows for the same product id by summing quantities —
  // same rule the backend's saveUserCart / this file's mergeCartItems use
  // for a guest/backend merge, applied here to a guest cart merging with
  // itself. Keeps the first row's metadata (name/price/image) since
  // duplicates shouldn't have divergent metadata to begin with; only the
  // quantity is meant to accumulate.
  const merged = new Map();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue; // corrupted entry — drop it

    const id = raw.id;
    if (id === undefined || id === null || id === '') continue; // can't address this item — drop it

    const rawQuantity = Number(raw.quantity);
    if (!Number.isFinite(rawQuantity) || rawQuantity < 1) continue; // corrupted/zero/negative — drop rather than guess
    const quantity = Math.floor(rawQuantity);

    const price = Number(raw.price);
    const stock =
      typeof raw.stock === 'number' && Number.isFinite(raw.stock) ? raw.stock : null;

    const existing = merged.get(id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      merged.set(id, {
        ...raw,
        id,
        quantity,
        price: Number.isFinite(price) ? price : 0,
        stock,
      });
    }
  }

  // Second pass: clamp the (now-summed) quantity to whatever stock
  // ceiling was captured on the item and to the same MAX_CART_QUANTITY
  // ceiling the backend enforces, dropping anything that clamps to
  // nothing left to actually keep.
  const normalized = [];
  for (const item of merged.values()) {
    const stockCeiling = typeof item.stock === 'number' ? Math.max(item.stock, 0) : Infinity;
    const quantity = Math.min(item.quantity, stockCeiling, MAX_CART_QUANTITY);
    if (quantity < 1) continue;
    normalized.push({ ...item, quantity });
  }

  return normalized;
};

export const getCartFromLocalStorage = () => {
  let parsed;
  try {
    const cart = JSON.parse(localStorage.getItem('cart'));
    parsed = Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }

  const normalized = normalizeGuestCartItems(parsed);

  // Self-heal: if normalizing actually changed anything (dropped a
  // corrupted row, merged a duplicate, clamped a stale quantity), write
  // the cleaned-up version back so every subsequent read — this tab,
  // another tab, the next visit — starts from the same clean state
  // instead of re-deriving it every time. Best-effort: if the write
  // itself fails, the caller still gets the correct normalized array in
  // memory either way, it just won't have stuck to disk.
  if (parsed.length !== normalized.length || JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    updateCartToLocalStorage(normalized);
  }

  return normalized;
};

export const updateCartToLocalStorage = (cart) => {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const clearCartFromLocalStorage = () => {
  try {
    localStorage.removeItem('cart');
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

// Marker used to make guest→backend sync idempotent. It's written right
// before the post-merge localStorage clear is attempted, and removed only
// once that clear actually succeeds. If a sync is retried while the marker
// is still present, it means a previous attempt already merged the guest
// items into the backend cart but failed to clear them locally — so the
// retry must skip the merge (it would double the quantities) and only
// retry the clear.
const SYNC_PENDING_KEY = 'cartSyncPendingClear';

export const markGuestCartMerged = () => {
  try {
    localStorage.setItem(SYNC_PENDING_KEY, '1');
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const isGuestCartMergePending = () => {
  try {
    return localStorage.getItem(SYNC_PENDING_KEY) === '1';
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const clearGuestCartMergeMarker = () => {
  try {
    localStorage.removeItem(SYNC_PENDING_KEY);
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

const BUY_NOW_KEY = 'buyNow';

export const getBuyNowItem = () => {
  try {
    const item = JSON.parse(localStorage.getItem(BUY_NOW_KEY));
    return item && typeof item === 'object' ? item : null;
  } catch {
    return null;
  }
};

export const setBuyNowItem = (product, quantity = 1) => {
  try {
    localStorage.setItem(
      BUY_NOW_KEY,
      JSON.stringify({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.images?.[0] || '',
      })
    );
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const clearBuyNowItem = () => {
  try {
    localStorage.removeItem(BUY_NOW_KEY);
  } catch (error) {
    handleError(error);
  }
};
