// src/config/cartLimits.js
//
// Mirrors the backend's MAX_CART_QUANTITY (backend's
// src/modules/cart/cart.validation.js) — that's the value the backend
// actually enforces (422 on POST/PUT /api/cart past it) for any
// signed-in cart mutation. It isn't a real business limit there either
// (the stock check in cart.service.js is what actually decides what's
// purchasable) — it's a cheap sanity ceiling against an obviously bogus
// quantity (a client bug looping an increment, someone probing with
// 9999999999999, etc.).
//
// The guest cart (localStorage-only, see features/cart/cartUtils.js)
// never reaches that backend validation until login merges it in, so
// without a client-side mirror of the same ceiling a guest could build
// up a quantity the backend would reject outright the moment they sign
// in — turning "please log in" into a broken cart. Applying the same
// cap client-side keeps guest and signed-in carts bulletproof against
// the same class of bogus value, not just signed-in ones.
//
// Static and public (not inventory/user-specific data that can go
// stale), so — same reasoning as src/config/pricing.js — it's safe to
// duplicate here, but the two files must be kept in sync by hand.
export const MAX_CART_QUANTITY = 10000;
