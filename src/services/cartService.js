// src/services/cartService.js
//
// Backend cart routes (see modules/cart/cart.routes.js): all require auth
// and operate on the logged-in user's cart as a whole.
import apiClient from '@/utils/apiClient';

/**
 * @returns {Promise<Array<{ productId: string, quantity: number, product: object }>>}
 */
export const getCart = async () => {
  const { data } = await apiClient.get('/api/cart');
  return data.data ?? [];
};

/**
 * Replaces the backend cart wholesale with the given items.
 * @param {Array<{ productId: string, quantity: number }>} cartItems
 */
export const saveCart = async (cartItems) => {
  const { data } = await apiClient.post('/api/cart', { cartItems });
  return data;
};

/**
 * Upserts a single line item's quantity.
 * @param {string} productId
 * @param {number} quantity
 */
export const updateCartItem = async (productId, quantity) => {
  const { data } = await apiClient.put('/api/cart', { productId, quantity });
  return data.data;
};

/**
 * @param {string} productId
 */
export const removeFromCart = async (productId) => {
  const { data } = await apiClient.delete('/api/cart', { data: { productId } });
  return data;
};

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
