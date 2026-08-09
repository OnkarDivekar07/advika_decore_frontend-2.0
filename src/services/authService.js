// src/services/authService.js
import apiClient from '@/utils/apiClient';
import { toE164 } from '@/utils/phoneValidation';

// API contract is unchanged: POST /api/otp/send-otp and
// POST /api/otp/verify-otp, both expecting `phone` as `+91XXXXXXXXXX`
// (see backend otp.validation.js / otp.service.js).

/**
 * Request an OTP be sent to the given phone number.
 * @param {string} localDigits - bare 10-digit number
 * @returns {Promise<{ message: string }>}
 */
export const sendOtp = async (localDigits) => {
  const { data } = await apiClient.post('/api/otp/send-otp', {
    phone: toE164(localDigits),
  });
  return data;
};

/**
 * Verify an OTP for the given phone number.
 * On success, the API returns an auth token (and user) for the session.
 * @param {string} localDigits - bare 10-digit number
 * @param {string} otp - 6-digit code
 * @returns {Promise<{ token: string, user: { id: string, phone: string } }>}
 */
export const verifyOtp = async (localDigits, otp) => {
  const { data } = await apiClient.post('/api/otp/verify-otp', {
    phone: toE164(localDigits),
    otp,
  });
  return data.data;
};
