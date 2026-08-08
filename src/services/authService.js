// src/services/authService.js
import apiClient from '@/utils/apiClient';

/**
 * Backend expects Indian numbers as `+91XXXXXXXXXX` (see otp.validation.js).
 * The UI only collects the bare 10-digit number, so normalize it here —
 * this is the single place that talks to the API.
 * @param {string} phone - bare 10-digit number
 * @returns {string} phone in `+91XXXXXXXXXX` form
 */
const toE164 = (phone) => `+91${phone}`;

/**
 * Request an OTP be sent to the given phone number.
 * @param {string} phone - bare 10-digit number
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export const sendOtp = async (phone) => {
  const { data } = await apiClient.post('/api/otp/send-otp', {
    phone: toE164(phone),
  });
  return data;
};

/**
 * Verify an OTP for the given phone number.
 * On success, expects the API to return an auth token for the session.
 * @param {string} phone - bare 10-digit number
 * @param {string} otp
 * @returns {Promise<{ token: string, user?: object }>}
 */
export const verifyOtp = async (phone, otp) => {
  const { data } = await apiClient.post('/api/otp/verify-otp', {
    phone: toE164(phone),
    otp,
  });
  return data.data;
};
