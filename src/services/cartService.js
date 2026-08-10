// src/services/cartService.js
//
// Backend cart routes (see modules/cart/cart.routes.js): all require auth
// and operate on the logged-in user's cart as a whole.
//
// --- Cart summary (subtotal/deliveryCharge/total) ---------------------
// Every one of these endpoints now rides a `meta.summary` alongside its
// usual `data` (see cart.controller.js) — computed server-side from the
// same live product data the mutation itself just validated against, so
// it can never drift from what checkout will actually charge. Every
// function here surfaces that `summary` to the caller (CartContext) so
// the backend stays the one source of truth for an authenticated cart's
// totals; nothing on the frontend re-derives delivery charge for a
// signed-in user anymore (see CartContext.jsx and src/config/pricing.js).
import apiClient from '@/utils/apiClient';

/**
 * @typedef {{ subtotal: number, deliveryCharge: number, total: number }} CartSummary
 */

/**
 * @returns {Promise<{ items: Array<{ productId: string, quantity: number, product: object }>, summary: CartSummary|null }>}
 */
export const getCart = async () => {
  const { data } = await apiClient.get('/api/cart');
  return { items: data.data ?? [], summary: data.meta?.summary ?? null };
};

/**
 * Replaces the backend cart wholesale with the given items.
 * @param {Array<{ productId: string, quantity: number }>} cartItems
 * @returns {Promise<{ items: Array<object>, summary: CartSummary|null }>}
 */
export const saveCart = async (cartItems) => {
  const { data } = await apiClient.post('/api/cart', { cartItems });
  return { items: data.data ?? [], summary: data.meta?.summary ?? null };
};

/**
 * Upserts a single line item's quantity.
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<{ item: object, summary: CartSummary|null }>}
 */
export const updateCartItem = async (productId, quantity) => {
  const { data } = await apiClient.put('/api/cart', { productId, quantity });
  return { item: data.data, summary: data.meta?.summary ?? null };
};

/**
 * @param {string} productId
 * @returns {Promise<{ summary: CartSummary|null }>}
 */
export const removeFromCart = async (productId) => {
  const { data } = await apiClient.delete('/api/cart', { data: { productId } });
  return { summary: data.meta?.summary ?? null };
};

// --- Discount / coupon placeholder architecture -----------------------------
// Preview-only: validates a code against the caller's live cart on the
// backend and returns what it would discount, without persisting anything.
// No coupon system exists on the backend yet (see calculateDiscount in the
// backend's src/constants/pricing.js), so every code currently comes back
// 404 — this exists so the wiring (service call, error shape, UI) is
// already correct for when one does, rather than inventing a fake discount
// client-side, which this app never does for money math.
/**
 * @param {string} couponCode
 * @returns {Promise<{ couponCode: string, subtotal: number, deliveryCharge: number, discount: number, total: number }>}
 */
export const previewCoupon = async (couponCode) => {
  const { data } = await apiClient.post('/api/cart/coupon', { couponCode });
  return data.data;
};

/**
 * @param {any} error - an axios error from previewCoupon
 * @returns {boolean} true if the failure means the code itself is invalid/
 *   expired (as opposed to a network/server error) — the distinction that
 *   matters for how the coupon input should react.
 */
export const isInvalidCouponError = (error) => error?.response?.status === 404;

// --- Stale-cart / stock-conflict detection --------------------------------
// A cart mutation can fail because our client-side view of the cart is out
// of date, not because the request itself was malformed: someone else's
// session (or another tab) already dropped the item (404), someone/something
// added it back concurrently (409), or the requested quantity now exceeds
// what's actually in stock (a 400 with a stock-flavored message — the
// backend doesn't have a dedicated status code for this case). In all of
// these, the client's optimistic snapshot is no longer trustworthy, so
// callers should resync from the server instead of rolling back to it.
const STOCK_CONFLICT_MESSAGE_HINTS = [
  'stock',
  'insufficient',
  'unavailable',
  'not enough',
  'out of stock',
];

/**
 * @param {any} error - an axios error from a cart mutation call
 * @returns {boolean} true if the failure means the client's cart state is
 *   stale and should be reloaded from the server rather than rolled back
 */
export const isCartConflictError = (error) => {
  const status = error?.response?.status;
  if (status === 409 || status === 404) return true;
  if (status !== 400) return false;

  const message = (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    ''
  ).toLowerCase();
  return STOCK_CONFLICT_MESSAGE_HINTS.some((needle) => message.includes(needle));
};
