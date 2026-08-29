// src/utils/constants.js

// Re-exported for backward compatibility with existing imports
// (`@/utils/constants` -> PHONE_REGEX / OTP_LENGTH). The canonical
// definitions now live in `phoneValidation.js` alongside the rest of the
// phone/OTP validation logic.
export { PHONE_REGEX, OTP_LENGTH } from './phoneValidation';

// --- OTP flow limits -------------------------------------------------
// These mirror the backend's own limits (src/middlewares/rateLimiter.js)
// so the UI can pre-emptively disable actions and show accurate
// countdowns instead of firing requests that are guaranteed to fail.
// The backend remains the real enforcement point; these are UX only.

// otp-send-limit: 5 requests / 60s window per phone.
export const SEND_OTP_MAX_ATTEMPTS = 5;
export const SEND_OTP_WINDOW_MS = 60 * 1000;
// Cooldown shown between individual resends, kept under the window above
// so a resend never races the server-side limiter. 45s matches the
// Login screen's design spec (design_handoff_advika_auto/README.md:
// "Resend in 45s").
export const RESEND_COOLDOWN_SECONDS = 45;

// otp-verify-limit: 5 attempts / 300s window per phone.
export const VERIFY_OTP_MAX_ATTEMPTS = 5;
export const VERIFY_OTP_WINDOW_MS = 5 * 60 * 1000;

// MSG91 OTP TTL isn't exposed to the client; 5 minutes is MSG91's
// platform default. Used only to show a "this code may have expired"
// hint client-side — the backend (via MSG91) is the real authority and
// will reject an expired code regardless of what we show here.
export const OTP_EXPECTED_TTL_MS = 5 * 60 * 1000;

// Session
export const AUTH_TOKEN_KEY = 'authToken';
