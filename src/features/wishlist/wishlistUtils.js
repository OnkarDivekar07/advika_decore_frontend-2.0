// src/features/wishlist/wishlistUtils.js
//
// Pure localStorage read/write primitives for the guest wishlist — same
// role cartUtils.js plays for the guest cart. No wishlist mutation
// decision-making lives here; WishlistContext.jsx is the single place
// that decides how a wishlist add/remove/merge actually happens (guest
// or backend mode).
import { handleError } from '@/utils/errorHandler';

const WISHLIST_KEY = 'wishlist';

// --- Guest-wishlist normalization --------------------------------------
// Same reasoning as cartUtils.normalizeGuestCartItems: localStorage is
// unvalidated JSON another tab, an old build, or a bug could have left
// in a bad shape (duplicate rows for the same product, a corrupted
// entry with no id). Clean it up once, in one place, so nothing further
// downstream has to defend against it.
//
// @param {any} rawItems - whatever JSON.parse produced from storage
// @returns {Array<{ productId: string, product: object }>}
export const normalizeGuestWishlistItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];

  const byProductId = new Map();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue; // corrupted entry — drop it

    const product = raw.product && typeof raw.product === 'object' ? raw.product : null;
    const productId = raw.productId ?? product?.id;
    if (!productId) continue; // can't address this item — drop it

    // Last one wins on a duplicate id (keeps the freshest snapshot),
    // same "dedupe by id" rule the guest cart uses.
    byProductId.set(productId, { productId, product: product || { id: productId } });
  }

  return Array.from(byProductId.values());
};

export const getWishlistFromLocalStorage = () => {
  let parsed;
  try {
    const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY));
    parsed = Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }

  const normalized = normalizeGuestWishlistItems(parsed);

  // Self-heal: persist the cleaned-up version if normalizing changed
  // anything, same as the guest cart does — best-effort, doesn't block
  // the caller if the write itself fails.
  if (parsed.length !== normalized.length) {
    updateWishlistToLocalStorage(normalized);
  }

  return normalized;
};

export const updateWishlistToLocalStorage = (items) => {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const clearWishlistFromLocalStorage = () => {
  try {
    localStorage.removeItem(WISHLIST_KEY);
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

// Idempotent-merge marker — identical purpose to cartUtils's
// SYNC_PENDING_KEY: written right before the post-merge localStorage
// clear is attempted, removed only once that clear actually succeeds.
// If a sync is retried while it's still present, a previous attempt
// already merged these items into the backend wishlist but failed to
// clear them locally, so the retry must skip straight to the clear
// (re-merging would just re-POST already-wishlisted ids — harmless
// since addToWishlist is an upsert — but pointless network traffic).
const SYNC_PENDING_KEY = 'wishlistSyncPendingClear';

export const markGuestWishlistMerged = () => {
  try {
    localStorage.setItem(SYNC_PENDING_KEY, '1');
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const isGuestWishlistMergePending = () => {
  try {
    return localStorage.getItem(SYNC_PENDING_KEY) === '1';
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const clearGuestWishlistMergeMarker = () => {
  try {
    localStorage.removeItem(SYNC_PENDING_KEY);
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};
