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
// Cooldown shown between individual resends, kept a little under the
// window above so a resend never races the server-side limiter.
export const RESEND_COOLDOWN_SECONDS = 30;

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

// --- Product catalog ---------------------------------------------------
// Vehicle categories a product can belong to. Kept as a single source of
// truth so the homepage category widget (components/Product/Categories)
// and the full product listing page (pages/Products) never drift apart.
export const PRODUCT_CATEGORIES = ['Truck', 'Tempo', 'Pickup', 'Car', 'Two Wheeler', 'Tractor'];
