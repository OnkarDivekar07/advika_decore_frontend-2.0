// src/services/orderService.js
//
// Draft-order service (see order.routes.js / order.service.js). The draft
// order is what re-validates stock/price/coupon/address ownership at this
// moment and is literally the object payment is charged against — never
// re-derive its numbers on the frontend. See checkout-architecture.md §1-3.
import apiClient from '@/utils/apiClient';

/**
 * Creates the user's draft order if none exists, or upserts (re-validates
 * and recomputes) their existing one otherwise — safe to call every time
 * the selected address or coupon changes (see order.service.js).
 *
 * @param {string} selectedAddressId
 * @param {string|null} [couponCode]
 * @returns {Promise<object>} the full draft order, including orderItems (with product)
 */
export const createOrUpdateDraftOrder = async (selectedAddressId, couponCode = null) => {
  const { data } = await apiClient.post('/api/order', {
    selectedAddressId,
    ...(couponCode ? { couponCode } : {}),
  });
  return data.data;
};

/**
 * @returns {Promise<object|null>} the current draft order, or null if none exists
 */
export const getDraftOrder = async () => {
  try {
    const { data } = await apiClient.get('/api/order');
    return data.data ?? null;
  } catch (error) {
    // getUserOrders (GET /api/order) 404s when there's no draft order for
    // this user yet — that's a normal "nothing to show", not a failure.
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

/**
 * Fetches a paginated page of the logged-in user's placed orders ("My
 * Orders") — GET /api/order/history. Never includes the in-progress draft
 * order getDraftOrder above returns; only orders that have actually been
 * placed (pending/confirmed/shipped/delivered/cancelled/returned), newest
 * first (see order.service.js#getUserOrderHistory).
 *
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<{ orders: object[], meta: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export const getOrderHistory = async ({ page = 1, limit = 10 } = {}) => {
  const { data } = await apiClient.get('/api/order/history', {
    params: { page, limit },
  });
  return { orders: data.data ?? [], meta: data.meta ?? {} };
};

/**
 * Fetches a single order by id — owner-or-admin (see order.routes.js /
 * order.controller.js's getOrderById). This is the ONE authoritative
 * source for a placed order's final state (status, paymentStatus, address,
 * locked-in item prices): unlike the router-state a checkout step hands
 * off to the next page, this is never stale, never lost on a refresh or a
 * bookmarked/shared link, and reflects whatever the payment/shipment
 * webhooks have reconciled server-side since the order was placed.
 *
 * @param {string} orderId
 * @returns {Promise<object>} the order, including orderItems (with product name) and address
 * @throws on 404 (no such order) or 403 (belongs to someone else) — callers
 *   should render an explicit "not found"/"not yours" state for those
 *   rather than treating them like a generic network failure.
 */
export const getOrderById = async (orderId) => {
  const { data } = await apiClient.get(`/api/order/${orderId}`);
  return data.data;
};
