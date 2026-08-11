// src/utils/checkoutStorage.js
//
// Session-scoped persistence for in-progress checkout, so a page refresh —
// or a tab that got reloaded while the Razorpay modal was up — doesn't
// throw away where the customer was and force them back to picking an
// address from scratch. CheckoutContext is scoped to the /checkout route
// tree and torn down (and its state reset) whenever that tree unmounts
// (see CheckoutLayout.jsx's own comment on why); this is what lets a
// *refresh* of that same tree recover, without changing that teardown
// behavior for an actual navigation away.
//
// Deliberately `sessionStorage`, matching authUtils.js's reasoning: scoped
// to the tab, gone the moment it's closed, and — importantly — everything
// read back out of here is only ever treated as a *hint*. CheckoutContext
// re-validates it against the backend (a real refreshDraftOrder call, the
// same server-side price/stock re-check any other address selection gets)
// before any of it is trusted for anything that touches money. See
// checkout-architecture.md §2 — nothing here is a substitute for that.
//
// ONLY non-sensitive UI state belongs in here — this module enforces that
// with an explicit allow-list rather than trusting every caller to keep
// scope creep out:
//   - selectedAddressId  — which saved address is picked (not the address
//                          itself; that's re-fetched from the backend)
//   - reviewConfirmed    — has the review step been seen for that address
//   - step               — which checkout step the UI was last on
//   - paymentMethod      — 'online' | 'cod' radio selection
//
// Never persisted here, on principle, even if a caller tries to pass it —
// see STORABLE_KEYS below, which silently drops anything not in the
// allow-list:
//   - card numbers, CVV, or any other raw payment credential (this app
//     never holds those client-side to begin with — Razorpay Checkout.js
//     collects them directly)
//   - Razorpay tokens/signatures or any other payment-provider secret
//   - authoritative totals/prices (subtotal, deliveryCharge, discount,
//     total) — those live only in draftOrder, in memory, and are always
//     re-fetched from the backend, never written here or trusted from here
const CHECKOUT_STATE_KEY = 'checkoutState';

// Every key this module will read or write. Anything else passed to
// saveCheckoutState is silently dropped rather than persisted — this is
// what stops a future caller from accidentally sessionStorage-ing
// something it shouldn't (a draft order, a totals object, a payment
// token) just by spreading too much state into the call.
const STORABLE_KEYS = ['selectedAddressId', 'reviewConfirmed', 'step', 'paymentMethod'];
const VALID_STEPS = ['address', 'review', 'payment'];
const VALID_PAYMENT_METHODS = ['online', 'cod'];

const hasSessionStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch {
    return false;
  }
};

const sanitize = (parsed) => {
  const out = {};
  if (typeof parsed.selectedAddressId === 'string' && parsed.selectedAddressId) {
    out.selectedAddressId = parsed.selectedAddressId;
  }
  out.reviewConfirmed = !!parsed.reviewConfirmed;
  out.step = VALID_STEPS.includes(parsed.step) ? parsed.step : 'address';
  out.paymentMethod = VALID_PAYMENT_METHODS.includes(parsed.paymentMethod)
    ? parsed.paymentMethod
    : 'online';
  return out;
};

/**
 * @returns {{ selectedAddressId?: string, reviewConfirmed: boolean, step: string, paymentMethod: string } | null}
 */
export const getSavedCheckoutState = () => {
  if (!hasSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(CHECKOUT_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.selectedAddressId) return null;
    return sanitize(parsed);
  } catch {
    // Corrupt entry (e.g. hand-edited storage) — don't let it crash restore.
    window.sessionStorage.removeItem(CHECKOUT_STATE_KEY);
    return null;
  }
};

// Shallow-merges into whatever's already saved (e.g. a step-only update
// shouldn't clobber the selectedAddressId written by an earlier
// selectAddress call, and vice versa) rather than each caller having to
// know the full shape. Only ever writes keys in STORABLE_KEYS — anything
// else in `state` (accidental or not) is dropped, not persisted.
export const saveCheckoutState = (state) => {
  if (!hasSessionStorage()) return;
  try {
    const existing = getSavedCheckoutState() || {};
    const merged = { ...existing, ...state };
    const allowed = STORABLE_KEYS.reduce((acc, key) => {
      if (key in merged) acc[key] = merged[key];
      return acc;
    }, {});
    window.sessionStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(sanitize(allowed)));
  } catch {
    // Quota/serialization errors — resuming checkout after a refresh is a
    // UX nicety, not something that should break the checkout flow itself.
  }
};

export const clearSavedCheckoutState = () => {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(CHECKOUT_STATE_KEY);
};
