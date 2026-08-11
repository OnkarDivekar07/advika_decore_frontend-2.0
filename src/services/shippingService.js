// src/services/shippingService.js
//
// Thin wrappers around the backend's Ekart-backed shipping endpoints (see
// shipping.routes.js). Same rule as everywhere else in checkout: this
// layer never computes or caches a delivery estimate or shipment status
// itself — it just relays what the backend (which itself defers to Ekart,
// and ultimately to the Ekart webhook as the real source of truth for
// delivery status) returns. See checkout-architecture.md §2.
import apiClient from '@/utils/apiClient';

/**
 * Checks whether a pincode is serviceable, before or during checkout.
 * Public endpoint — no auth required, safe to call as soon as a 6-digit
 * pincode is entered on the address form.
 *
 * @param {{ pincode: string, paymentMode?: 'COD'|'PREPAID', weightKg?: number }} params
 * @returns {Promise<{ serviceable: boolean, estimatedDays: number|null, codAvailable: boolean }>}
 */
export const checkServiceability = async ({ pincode, paymentMode, weightKg }) => {
  const { data } = await apiClient.post('/api/shipping/serviceability', {
    pincode,
    ...(paymentMode ? { paymentMode } : {}),
    ...(weightKg ? { weightKg } : {}),
  });
  return data.data;
};

/**
 * Fetches the latest shipment status for an order. The backend polls
 * Ekart live on every call and persists whatever it gets back, so this
 * is safe to call again for a manual "refresh" rather than needing our
 * own background polling on top of it.
 *
 * Note: a confirmed order doesn't get a Shipment record until an admin
 * triggers `POST /api/shipping/:orderId/create` — so a 404 here right
 * after checkout is the normal "not shipped yet" state, not an error.
 *
 * @param {string} orderId
 * @returns {Promise<object>} the Shipment record
 */
export const trackShipment = async (orderId) => {
  const { data } = await apiClient.get(`/api/shipping/${orderId}/track`);
  return data.data;
};

/**
 * Cancels an order's shipment (only possible before it's out for
 * delivery — the backend rejects it otherwise with a 400).
 *
 * @param {string} orderId
 * @param {string} [reason]
 * @returns {Promise<object>} the updated Shipment record
 */
export const cancelShipment = async (orderId, reason) => {
  const { data } = await apiClient.post(`/api/shipping/${orderId}/cancel`, reason ? { reason } : {});
  return data.data;
};
