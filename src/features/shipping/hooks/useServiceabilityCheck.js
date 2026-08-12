// src/features/shipping/hooks/useServiceabilityCheck.js
//
// Single reusable implementation of "call POST /api/shipping/serviceability
// for a pincode and track the request's lifecycle" — see
// shippingService.checkServiceability. Before this existed, ProductDetails,
// AddressForm, and ReviewPage each carried their own copy of this fetch +
// debounce + cancellation logic with slightly different shapes. Consolidated
// here so there's exactly one place that knows how to ask the backend
// "can we deliver here, and by when" — every caller gets the same
// request-cancellation, race-safety, and error/retry behavior for free.
//
// Purely a data hook — it renders nothing. Pair it with
// <ServiceabilityMessage> (components/Shipping/ServiceabilityMessage.jsx)
// for the matching presentational piece, or read `status`/`data` directly
// for a custom rendering (see ReviewPage.jsx).
import { useCallback, useEffect, useRef, useState } from 'react';
import { PINCODE_REGEX } from '@/utils/pincodeValidation';
import { useDebouncedValue } from '@/features/products/hooks/useDebouncedValue';
import * as shippingService from '@/services/shippingService';

/**
 * @param {string} pincode - raw or already-validated pincode to check.
 * @param {object} [options]
 * @param {number} [options.debounceMs=500] - debounce delay before firing
 *   the request. Pass 0 for an already-settled value (e.g. a saved
 *   address's pincode, which doesn't need debouncing the way free-typed
 *   input does — see ReviewPage.jsx).
 * @param {boolean} [options.enabled=true] - set false to skip checking
 *   entirely (e.g. while a parent form/step isn't ready yet) without
 *   unmounting the hook.
 * @param {'COD'|'PREPAID'} [options.paymentMode] - real input, not static
 *   config: a caller switching COD <-> PREPAID gets a fresh check against
 *   the mode that's actually about to be charged.
 * @param {number} [options.weightKg] - real input too: a caller that
 *   derives this from the live cart/draft order (see ReviewPage.jsx) gets
 *   an automatic recheck whenever cart items/quantities change during
 *   checkout, exactly like a pincode edit would trigger one.
 * @param {number} [options.subtotal] - forwarded as-is to
 *   shippingService.checkServiceability so the response also carries
 *   deliveryCharge/freeDeliveryEligible for this amount; also, like
 *   weightKg, a real recheck trigger — a caller passing the draft order's
 *   own subtotal gets a fresh check whenever that changes.
 * @param {string|number} [options.recalcKey] - opaque value that
 *   participates in the recheck trigger without itself being sent to the
 *   backend. For callers where `weightKg` alone can't be trusted to change
 *   on every cart edit that matters (e.g. two line items swapping
 *   quantities while total weight/item-count coincidentally stays the
 *   same), pass something that reliably changes whenever the cart does —
 *   e.g. a signature built from the draft order's item ids + quantities
 *   (see ReviewPage.jsx) — so a stale cart never leaves a stale shipping
 *   check sitting unrefreshed behind it.
 * @returns {{
 *   status: 'idle'|'checking'|'ready'|'error',
 *   data: object|null,
 *   retry: () => void,
 * }}
 *   `data` is the backend's serviceability response
 *   (`{ serviceable, reason, estimatedDays, estimatedDeliveryDate, codAvailable }`)
 *   once `status === 'ready'`, otherwise null. `retry()` re-fires the exact
 *   same request on demand — the real backend call a "Retry" button should
 *   invoke after an `error`, not a fake local reset that never asks Ekart
 *   again.
 */
export function useServiceabilityCheck(
  pincode,
  { debounceMs = 500, enabled = true, paymentMode, weightKg, subtotal, recalcKey } = {}
) {
  const debouncedPincode = useDebouncedValue(pincode, debounceMs);
  // Skip the debounce hop entirely for a value that's already settled
  // (debounceMs = 0) — otherwise a mount-time value would still wait one
  // tick before its first check.
  const effectivePincode = debounceMs > 0 ? debouncedPincode : pincode;

  const [result, setResult] = useState({ status: 'idle', data: null });

  // Bumped by retry() to force the effect below to re-fire the same
  // request even when none of pincode/paymentMode/weightKg actually
  // changed — e.g. retrying after a transient network/Ekart error against
  // the exact same address. Doesn't participate in anything else.
  const [retryTick, setRetryTick] = useState(0);

  // Monotonically increasing id for whichever request the effect below is
  // currently in flight for. A response is only ever applied to state if
  // its id still matches this ref when it resolves — i.e. it's the most
  // recently *started* request. This is what stops a slower, older
  // request (e.g. one kicked off for a stale cart weight just before a
  // rapid second quantity change, or an Ekart response that simply takes
  // longer to come back than the one right after it) from resolving after
  // a newer one and clobbering fresher shipping state with stale data —
  // plain effect-cleanup cancellation only guards the common
  // unmount/dep-change case, not two in-flight requests racing each other
  // to resolve out of order.
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !PINCODE_REGEX.test(effectivePincode || '')) {
      setResult({ status: 'idle', data: null });
      return undefined;
    }

    const requestId = ++latestRequestIdRef.current;
    let cancelled = false;
    setResult({ status: 'checking', data: null });

    const isStale = () => cancelled || requestId !== latestRequestIdRef.current;

    shippingService
      .checkServiceability({ pincode: effectivePincode, paymentMode, weightKg, subtotal })
      .then((data) => {
        if (isStale()) return;
        setResult({ status: 'ready', data });
      })
      .catch(() => {
        if (isStale()) return;
        // Non-critical everywhere this is used — a failed check never
        // silently blocks the user by itself; callers (see ReviewPage.jsx)
        // decide what, if anything, to gate on the 'error' status, and
        // always get a real retry() to re-ask the backend rather than a
        // dead end.
        setResult({ status: 'error', data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [effectivePincode, enabled, paymentMode, weightKg, subtotal, recalcKey, retryTick]);

  // Re-fires the same request (same pincode/paymentMode/weightKg) against
  // the backend. Safe to call from a 'ready'/serviceable:false state too —
  // not just 'error' — since a definitive "not serviceable" answer can
  // also go stale if the underlying inputs already changed by the time
  // the user taps Retry.
  const retry = useCallback(() => setRetryTick((n) => n + 1), []);

  return { ...result, retry };
}
