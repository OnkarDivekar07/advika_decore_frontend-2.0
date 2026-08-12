// src/config/pricing.js
//
// STATIC FALLBACK ONLY. The backend is the single source of truth for the
// free-delivery threshold and flat delivery charge (see
// src/constants/pricing.js / src/config/env.js in the backend repo, which
// are themselves configurable via FREE_DELIVERY_THRESHOLD / DELIVERY_CHARGE
// env vars) — the frontend fetches the live values from
// GET /api/shipping/delivery-config once, at app start, via
// PricingContext.jsx, rather than hardcoding its own copy.
//
// These two constants exist only as the value PricingContext renders
// before that first fetch resolves (or if it fails outright) — a brief
// startup window, not a second source of truth to keep hand-synced with
// the backend. Nothing should import these directly for a real
// calculation; use `usePricing()` instead, which returns the live
// backend-fetched values (falling back to these only until they load).
export const FREE_DELIVERY_THRESHOLD = 600;
export const DELIVERY_CHARGE = 49;

/**
 * Fallback-only version of the backend's calculateDeliveryCharge, using the
 * static defaults above. Prefer `usePricing().calculateDeliveryCharge`,
 * which uses the live fetched values.
 *
 * @param {number} subtotal
 * @returns {number} delivery charge to preview — 0 once subtotal clears the threshold
 */
export const calculateDeliveryCharge = (subtotal) =>
  subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
