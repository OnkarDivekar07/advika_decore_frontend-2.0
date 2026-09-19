// src/services/userService.js
//
// Thin wrappers around the backend's account/profile endpoints (see
// user.routes.js). Address CRUD has its own service (addressService.js) —
// this one is for the user's own profile fields (name, phone).
import apiClient from '@/utils/apiClient';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   email: string,
 *   phone: string,
 *   createdAt: string,
 * }} UserProfile
 */

/**
 * @returns {Promise<UserProfile>}
 */
export const getProfile = async () => {
  const { data } = await apiClient.get('/api/user/profile');
  return data.data;
};

/**
 * @param {{ name: string }} payload
 * @returns {Promise<UserProfile>}
 */
export const updateProfile = async (payload) => {
  const { data } = await apiClient.patch('/api/user/profile', payload);
  return data.data;
};

/**
 * Deletes (anonymizes) the signed-in user's account — see
 * user.service.js's deleteAccount on the backend for exactly what this
 * does and doesn't remove. The caller is responsible for clearing the
 * locally-stored session (AuthContext's logout) right after this
 * resolves — the backend can't revoke the JWT itself (see
 * authenticate.js), so the client dropping it is what actually ends the
 * session immediately rather than at its natural 1-hour expiry.
 * @returns {Promise<{ message: string }>}
 */
export const deleteAccount = async () => {
  const { data } = await apiClient.delete('/api/user/account');
  return data;
};

/**
 * Step 1 of changing the signed-in user's mobile number: sends an OTP to
 * the new number.
 * @param {string} fullPhone - full E.164 phone, e.g. "+919876543210"
 * @returns {Promise<{ message: string }>}
 */
export const sendPhoneChangeOtp = async (fullPhone) => {
  const { data } = await apiClient.post('/api/user/phone/send-otp', { phone: fullPhone });
  return data;
};

/**
 * Step 2: verifies the OTP and commits the new phone to the user's
 * profile.
 * @param {string} fullPhone - the same number sendPhoneChangeOtp was called with
 * @param {string} otp - 6-digit code
 * @returns {Promise<UserProfile>}
 */
export const verifyPhoneChangeOtp = async (fullPhone, otp) => {
  const { data } = await apiClient.post('/api/user/phone/verify-otp', {
    phone: fullPhone,
    otp,
  });
  return data.data;
};
