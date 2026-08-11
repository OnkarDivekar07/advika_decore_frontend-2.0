// src/utils/pincodeValidation.js
//
// Single source of truth for validating Indian PIN codes on the client —
// mirrors the backend's own INDIAN_PINCODE_REGEX
// (src/modules/user/user.validation.js) so a value accepted here is never
// rejected server-side, and vice versa.

// Exactly 6 digits, first digit 1-9 — no Indian postal zone starts with 0.
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/** Strip everything but digits and cap at 6 characters, for controlled inputs. */
export function sanitizePincodeInput(raw) {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

/** @param {string} pincode */
export function isValidIndianPincode(pincode) {
  return PINCODE_REGEX.test(String(pincode ?? ''));
}
