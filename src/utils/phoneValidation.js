// src/utils/phoneValidation.js
//
// Single source of truth for validating/formatting Indian mobile numbers
// on the client. Kept intentionally a little stricter than the backend's
// `/^\+91\d{10}$/` (which allows any leading digit) so obviously-invalid
// numbers (landlines, numbers starting 0-5) are caught before we spend an
// OTP send on them — the backend remains the real authority and this can
// never be looser than it.

// Indian mobile numbers: 10 digits, first digit 6-9 (TRAI numbering plan).
const INDIAN_MOBILE_LOCAL_REGEX = /^[6-9]\d{9}$/;
export const PHONE_REGEX = /^\+91[6-9]\d{9}$/; // full E.164 form
export const OTP_LENGTH = 6;
export const OTP_REGEX = /^\d{6}$/;

/**
 * Strip everything but digits, then reduce to a bare 10-digit local
 * number. If more than 10 digits come in — e.g. the user pasted their
 * full number with the +91 country code, or a leading 0 — keep the
 * *last* 10 digits rather than the first 10, matching the backend's own
 * normalization (see normalizePhone.js: `digitsOnly.slice(-10)`).
 * Taking the first 10 instead would silently keep the country code and
 * drop the real final digits, turning a valid pasted number into a
 * different, wrong one that still looks superficially valid.
 */
export function sanitizePhoneInput(raw) {
  const digitsOnly = String(raw ?? '').replace(/\D/g, '');
  return digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
}

/** @param {string} localDigits - bare 10-digit number (no +91) */
export function isValidIndianMobile(localDigits) {
  return INDIAN_MOBILE_LOCAL_REGEX.test(localDigits);
}

/** @param {string} localDigits - bare 10-digit number (no +91) */
export function toE164(localDigits) {
  return `+91${localDigits}`;
}

/** @param {string} fullPhone - e.g. "+919876543210" */
export function fromE164(fullPhone) {
  return String(fullPhone ?? '').replace(/^\+?91/, '').replace(/\D/g, '').slice(0, 10);
}

/** Mask all but the last 2 digits for display in toasts/labels, e.g. "•••••••• 10". */
export function maskPhone(localDigits) {
  if (!localDigits || localDigits.length < 2) return localDigits ?? '';
  return `${'•'.repeat(localDigits.length - 2)}${localDigits.slice(-2)}`;
}

/** @param {string} otp */
export function isValidOtp(otp) {
  return OTP_REGEX.test(otp);
}

export function sanitizeOtpInput(raw) {
  return String(raw ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH);
}
