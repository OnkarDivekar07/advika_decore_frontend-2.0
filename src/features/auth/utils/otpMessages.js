// src/features/auth/utils/otpMessages.js
//
// Translates a `useOtpFlow` result's `code` (+ interpolation data) into
// user-facing text via i18next, falling back to the hook's plain-English
// `message` if a translation key is somehow missing. Centralized here so
// PhoneOtpModal and OTPVerificationPage show identical, fully
// translated copy for every outcome instead of each hardcoding its own.
const CODE_TO_KEY = {
  SEND_OK: 'otp.sent',
  RESEND_OK: 'otp.resent',
  SEND_RATE_LIMIT_LOCAL: 'otp.errors.sendRateLimit',
  SEND_RATE_LIMIT_SERVER: 'otp.errors.sendRateLimitServer',
  SEND_GENERIC_ERROR: 'otp.sendFailed',
  VERIFY_OK: 'otp.verified',
  VERIFY_RATE_LIMIT_LOCAL: 'otp.errors.verifyRateLimit',
  VERIFY_RATE_LIMIT_SERVER: 'otp.errors.verifyRateLimitServer',
  VERIFY_EXPIRED: 'otp.errors.expired',
  VERIFY_INVALID: 'otp.verifyFailed',
  NETWORK_ERROR: 'otp.errors.network',
};

/**
 * @param {(key: string, fallback: string, opts?: object) => string} t - react-i18next's t()
 * @param {{ code: string, message?: string, seconds?: number }} result - a useOtpFlow outcome
 * @returns {string}
 */
export function translateOtpResult(t, result) {
  if (!result?.code) return result?.message || '';
  const key = CODE_TO_KEY[result.code];
  if (!key) return result.message || '';
  return t(key, result.message || '', { seconds: result.seconds });
}
