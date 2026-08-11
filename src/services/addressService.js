// src/services/addressService.js
//
// Thin CRUD wrappers around the backend's address endpoints (see
// user.routes.js) — no business-rule validation here, only the form-level
// validation that belongs on the client (required fields, pincode shape,
// etc). Whether an address is actually *usable* for an order (ownership,
// existence) is re-checked server-side at draft-order time regardless of
// what this layer returns — see checkout-architecture.md §0.
import apiClient from '@/utils/apiClient';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   phone: string,
 *   pincode: string,
 *   city: string,
 *   state: string,
 *   houseArea: string,
 *   landmark?: string,
 * }} Address
 */

/**
 * @returns {Promise<Address[]>}
 */
export const getAddresses = async () => {
  const { data } = await apiClient.get('/api/user/addresses');
  return data.data ?? [];
};

/**
 * @param {Omit<Address, 'id'>} payload
 * @returns {Promise<Address>}
 */
export const createAddress = async (payload) => {
  const { data } = await apiClient.post('/api/user/address', payload);
  return data.data;
};

/**
 * @param {string} id
 * @param {Partial<Omit<Address, 'id'>>} payload
 * @returns {Promise<Address>}
 */
export const updateAddress = async (id, payload) => {
  const { data } = await apiClient.put(`/api/user/address/${id}`, payload);
  return data.data;
};

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteAddress = async (id) => {
  await apiClient.delete(`/api/user/address/${id}`);
};
