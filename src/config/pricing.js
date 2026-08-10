// src/config/pricing.js
//
// Flat-rate delivery charge — mirrors the backend's own source of truth
// at src/constants/pricing.js (in the backend repo).
//
// GUEST CARTS ONLY. For a signed-in cart, the backend is the single
// source of truth for totals: every cart endpoint returns its own
// subtotal/deliveryCharge/total (see cart.controller.js's `meta.summary`),
// and CartContext.jsx uses that directly rather than calling
// calculateDeliveryCharge below — see its `summary` useMemo. This file
// exists purely so an anonymous (not-yet-authenticated) cart, which has
// no backend cart to ask, can still show a live preview without forcing a
// login. The moment a guest cart is merged into the backend at login (see
// CartContext.syncGuestCartToBackend), this stops being consulted for the
// rest of the session.
//
// That's safe to duplicate because it's a static, publicly-known business
// rule (not inventory/user-specific data that can go stale) — but it DOES
// mean these two numbers must be kept in sync by hand with the backend's
// copy. If this rule ever needs to vary per order (promotions,
// per-pincode shipping, etc.), this mirroring assumption breaks and guest
// carts should show an "estimated at checkout" message instead of a
// number computed locally.
export const FREE_DELIVERY_THRESHOLD = 600;
export const DELIVERY_CHARGE = 49;

/**
 * @param {number} subtotal
 * @returns {number} delivery charge to preview — 0 once subtotal clears the threshold
 */
export const calculateDeliveryCharge = (subtotal) =>
  subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
