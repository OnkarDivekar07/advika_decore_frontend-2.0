// src/services/wishlistService.js
//
// Thin wrappers around the backend's wishlist endpoints (see
// wishlist.routes.js). Unlike cart, wishlisting has no guest/localStorage
// mode — every call here requires a signed-in session, same as
// addressService/orderService.
import apiClient from '@/utils/apiClient';

/**
 * @typedef {{
 *   id: string,
 *   userId: string,
 *   productId: string,
 *   createdAt: string,
 *   product: object,
 * }} WishlistItem
 */

/**
 * @returns {Promise<WishlistItem[]>}
 */
export const getWishlist = async () => {
  const { data } = await apiClient.get('/api/wishlist');
  return data.data ?? [];
};

/**
 * @param {string} productId
 * @returns {Promise<WishlistItem>}
 */
export const addToWishlist = async (productId) => {
  const { data } = await apiClient.post('/api/wishlist', { productId });
  return data.data;
};

/**
 * @param {string} productId
 * @returns {Promise<void>}
 */
export const removeFromWishlist = async (productId) => {
  await apiClient.delete(`/api/wishlist/${productId}`);
};
