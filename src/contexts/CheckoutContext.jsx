// src/contexts/CheckoutContext.jsx
//
// Drives the /checkout stepper (address -> review -> payment) against the
// backend's draft-order/payment pipeline documented in
// checkout-architecture.md. Mirrors CartContext's own rule: anything that
// touches money is backend-derived and re-fetched here, never computed
// locally; only the *selection* of address and the current step are local
// UI state (see §2, the state ownership matrix).
//
// Scoped to the checkout route tree only (see CheckoutLayout.jsx) rather than
// sitting at the app root like CartContext/AuthContext — nothing outside
// the checkout flow needs this state, and scoping it means it's naturally
// torn down (and its draft-order polling/loading state reset) if the user
// navigates away and comes back later.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as addressService from '@/services/addressService';
import * as orderService from '@/services/orderService';
import * as paymentService from '@/services/paymentService';
import { handleError } from '@/utils/errorHandler';
import {
  getSavedCheckoutState,
  saveCheckoutState,
  clearSavedCheckoutState,
} from '@/utils/checkoutStorage';

const CheckoutContext = createContext(null);

export const STEPS = ['address', 'review', 'payment'];

export function CheckoutProvider({ children }) {
  // Read once, synchronously, before any effects run — this is what makes
  // isRestoring's initial value (below) accurate on the very first render,
  // so a page that bounces on "nothing to show yet" (PaymentPage) knows to
  // wait rather than firing before restore has had a chance to run. See
  // checkoutStorage.js for why this is only ever treated as a hint.
  const savedStateRef = useRef(getSavedCheckoutState());

  // Non-sensitive UI hints only — which step the customer was last on and
  // which payment method they'd picked. Neither gates anything by itself
  // (the route guards in ReviewPage/PaymentPage are driven by
  // canProceedToReview/canProceedToPayment, which are always re-derived
  // from the backend-validated draftOrder, never from these) — they just
  // save a refreshed tab from resetting to "Address" / "Pay online" for
  // no reason. Only trusted as a starting value when there's also a saved
  // address to go with it; a step/method with no address is meaningless.
  const [step, setStep] = useState(
    savedStateRef.current?.selectedAddressId ? savedStateRef.current.step : 'address'
  );
  const [paymentMethod, setPaymentMethodState] = useState(
    savedStateRef.current?.paymentMethod || 'online'
  );

  const [addresses, setAddresses] = useState([]);
  const [addressesStatus, setAddressesStatus] = useState('idle'); // 'idle'|'loading'|'ready'|'error'
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  // Has the customer actually looked at the review step (address + order
  // summary) for the *current* selection and explicitly moved on from it?
  // This is what stops a direct/typed visit to /checkout/payment from
  // skipping review even though it has everything else it needs (a
  // selected address + a ready draft order) — see confirmReview() and the
  // route guards in ReviewPage/PaymentPage. Any address mutation
  // (select/add/edit/remove) resets this back to false: the review the
  // customer confirmed was of a specific address + total, so a changed
  // address means a changed review.
  const [reviewConfirmed, setReviewConfirmed] = useState(
    !!savedStateRef.current?.reviewConfirmed
  );

  const [draftOrder, setDraftOrder] = useState(null);
  const [draftStatus, setDraftStatus] = useState('idle'); // 'idle'|'loading'|'ready'|'error'
  const [draftError, setDraftError] = useState(null);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // Structured price/stock drift reported by the backend's
  // detectOrderConflicts (see order.service.js) — set whenever COD
  // placement or Razorpay-order creation comes back 409 with a
  // `conflicts` array, cleared the moment a fresh draft order is
  // successfully fetched (i.e. the drift has been reviewed/resolved).
  const [conflicts, setConflicts] = useState(null);

  // True only when there's a saved selection from a previous visit this
  // provider hasn't finished trying to restore/re-validate yet — a normal
  // (non-refreshed) checkout visit starts with nothing saved, so this is
  // `false` for it from the very first render and never costs it anything.
  const [isRestoring, setIsRestoring] = useState(!!savedStateRef.current?.selectedAddressId);

  const extractConflicts = (error) => error?.response?.data?.errors?.conflicts ?? null;

  // Deliberately doesn't auto-select an address itself (that would need to
  // read `selectedAddressId` inside a callback with an empty dep array,
  // which goes stale the moment something *does* get selected) — the
  // caller decides whether/what to default to once it sees the list, via
  // selectAddress.
  const loadAddresses = useCallback(async () => {
    setAddressesStatus('loading');
    try {
      const list = await addressService.getAddresses();
      setAddresses(list);
      setAddressesStatus('ready');
      return list;
    } catch (error) {
      setAddressesStatus('error');
      handleError(error, "Couldn't load your saved addresses.");
      return [];
    }
  }, []);

  // Re-POSTs the draft order for whichever address is passed — safe/
  // idempotent upsert per order.service.js, so calling this again on every
  // address or coupon change just refreshes the same draft row rather than
  // creating duplicates.
  const refreshDraftOrder = useCallback(async (addressId, couponCode = null) => {
    if (!addressId) return null;
    setDraftStatus('loading');
    setDraftError(null);
    try {
      const order = await orderService.createOrUpdateDraftOrder(addressId, couponCode);
      setDraftOrder(order);
      setDraftStatus('ready');
      // A successful re-fetch is itself the resolution to any previously
      // reported conflict — it re-ran the same server-side price/stock
      // check and came back clean this time.
      setConflicts(null);
      return order;
    } catch (error) {
      setDraftStatus('error');
      const message =
        error?.response?.data?.message ||
        "Couldn't prepare your order. Please review your cart and try again.";
      setDraftError({ message, details: error?.response?.data?.data ?? null });
      handleError(error, message);
      return null;
    }
  }, []);

  const selectAddress = useCallback(
    async (id) => {
      setSelectedAddressId(id);
      // A (re)selection invalidates any earlier review confirmation — the
      // customer needs to see the review step again for this address/total
      // before payment is reachable. See reviewConfirmed's own comment.
      setReviewConfirmed(false);
      const order = await refreshDraftOrder(id);
      // Only persist a selection the backend actually accepted — an id
      // that immediately produced a conflict/error isn't something a
      // future refresh should try to resume into.
      if (order) saveCheckoutState({ selectedAddressId: id, reviewConfirmed: false });
      return order;
    },
    [refreshDraftOrder]
  );

  const addAddress = useCallback(
    async (payload) => {
      const created = await addressService.createAddress(payload);
      setAddresses((prev) => [...prev, created]);
      await selectAddress(created.id);
      return created;
    },
    [selectAddress]
  );

  // Updates a saved address in place. If it's the one currently selected,
  // the draft order is re-fetched too — an edited address can change the
  // delivery charge/availability the backend computed against it (see
  // checkout-architecture.md §2), so the draft can't just be left as-is.
  const editAddress = useCallback(
    async (id, payload) => {
      const updated = await addressService.updateAddress(id, payload);
      setAddresses((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (id === selectedAddressId) {
        // The edit can change what the delivery API/backend charges for
        // this address (see refreshDraftOrder), so whatever was reviewed
        // before is stale — same reasoning as selectAddress.
        setReviewConfirmed(false);
        saveCheckoutState({ selectedAddressId: id, reviewConfirmed: false });
        await refreshDraftOrder(id);
      }
      return updated;
    },
    [selectedAddressId, refreshDraftOrder]
  );

  // Removes a saved address. If it was the selected one, the selection
  // and draft order are cleared — there is deliberately no auto-fallback
  // to another address, since silently charging/shipping to a different
  // address than the one the user last chose would be surprising.
  const removeAddress = useCallback(
    async (id) => {
      await addressService.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (id === selectedAddressId) {
        setSelectedAddressId(null);
        setDraftOrder(null);
        setDraftStatus('idle');
        setReviewConfirmed(false);
        clearSavedCheckoutState();
      }
    },
    [selectedAddressId]
  );

  // Restore-on-mount: re-validate a selection saved by a previous visit to
  // this route tree (typically: the same visit, before a refresh blew away
  // React state) against the backend before trusting it for anything.
  // Runs once per mount, and is a no-op (skips straight to "not
  // restoring") when there's nothing saved — which is the normal case for
  // a fresh checkout visit, so it costs that path nothing.
  const restoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const saved = savedStateRef.current;
    if (!saved?.selectedAddressId) return; // isRestoring already starts false in this case

    (async () => {
      try {
        const list = await loadAddresses();
        const stillExists = list.some((a) => a.id === saved.selectedAddressId);
        if (stillExists) {
          setSelectedAddressId(saved.selectedAddressId);
          // Re-runs the exact same server-side price/stock/address-ownership
          // check any other address selection gets (see refreshDraftOrder) —
          // nothing about a resumed session is trusted more than that.
          const order = await refreshDraftOrder(saved.selectedAddressId);
          // reviewConfirmed itself doesn't touch money — it only gates
          // client-side route access — so it's fine to trust the saved
          // hint as-is once the address/draft it was confirmed against
          // has been successfully re-validated above. If re-validation
          // failed, leave it at its initial (false) value: nothing to
          // resume into.
          if (order) setReviewConfirmed(!!saved.reviewConfirmed);
        } else {
          // The saved address no longer exists (deleted from another tab,
          // etc.) — nothing safe to resume into; drop it and let the
          // customer pick again rather than silently going nowhere. The
          // step/paymentMethod hints go with it — they were only ever
          // meaningful alongside that address.
          setStep('address');
          clearSavedCheckoutState();
        }
      } finally {
        setIsRestoring(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAddresses, refreshDraftOrder]);

  const goToStep = useCallback((next) => {
    if (!STEPS.includes(next)) return;
    setStep(next);
    // A UI-only hint (see the state declaration above) — dropped by
    // checkoutStorage's own validation if there's no selectedAddressId to
    // anchor it to yet.
    saveCheckoutState({ step: next });
  }, []);

  // 'online' | 'cod' radio selection on the payment step. Purely a UI
  // preference — never anything that could touch card/payment credentials,
  // which this app never holds client-side to begin with (Razorpay
  // Checkout.js collects those directly).
  const setPaymentMethod = useCallback((method) => {
    if (method !== 'online' && method !== 'cod') return;
    setPaymentMethodState(method);
    saveCheckoutState({ paymentMethod: method });
  }, []);

  const clearConflicts = useCallback(() => setConflicts(null), []);

  // Called by ReviewPage once the customer has seen the address + order
  // summary and chosen to proceed — this is the one place reviewConfirmed
  // is ever set to true, which is what canProceedToPayment (and the
  // PaymentPage route guard) checks before letting the payment step
  // render, whether reached by clicking "Proceed to Payment" or by typing
  // /checkout/payment directly.
  const confirmReview = useCallback(() => {
    if (!selectedAddressId || !draftOrder) return;
    setReviewConfirmed(true);
    saveCheckoutState({ selectedAddressId, reviewConfirmed: true });
  }, [selectedAddressId, draftOrder]);

  // --- Payment -------------------------------------------------------------
  const placeCODOrder = useCallback(async () => {
    if (!draftOrder) throw new Error('No draft order to place.');
    setIsPlacingOrder(true);
    try {
      // Idempotent server-side (see payment.service.js's handleCODOrder) —
      // a retry after a dropped response (order placed, but the response
      // never made it back) just comes back `alreadyProcessed: true`
      // instead of double-placing, so simply letting the customer press
      // this again on failure is itself a safe recovery path here.
      const result = await paymentService.placeCODOrder(draftOrder.id);
      setConflicts(null);
      clearSavedCheckoutState();
      return result.order;
    } catch (error) {
      const found = extractConflicts(error);
      if (found) setConflicts(found);
      throw error;
    } finally {
      setIsPlacingOrder(false);
    }
  }, [draftOrder]);

  // Opens Razorpay Checkout.js for the current draft order and forwards
  // the result to /verify. Resolves with { orderId, paymentStatus } — the
  // caller (PaymentStep) navigates to the success page regardless of
  // whether /verify itself came back "success", since the webhook is the
  // real backstop (see checkout-architecture.md §3.2 step 4).
  const payOnline = useCallback(
    async ({ customerName, customerPhone }) => {
      if (!draftOrder) throw new Error('No draft order to pay for.');
      setIsPlacingOrder(true);
      try {
        // Can 409 here if the draft has gone stale since it was last
        // fetched (see payment.controller.js's createOrderid — it runs
        // detectOrderConflicts before ever creating a Razorpay order for
        // this total) — caught below like the COD path.
        const created = await paymentService.createRazorpayOrder();

        // The backend found a payment already captured against this draft
        // order and reconciled it just now — see createOrderid's
        // reuse-or-reconcile logic. There's no modal to open; this is most
        // likely reached via a retry after an earlier attempt's /verify
        // call never made it back (dropped network, closed tab) even
        // though the payment itself went through.
        if (created.alreadyPaid) {
          setConflicts(null);
          clearSavedCheckoutState();
          return { orderId: created.orderId, paymentStatus: 'paid' };
        }

        const { order: razorpayOrder, key_id: keyId } = created;
        const response = await paymentService.openRazorpayCheckout({
          razorpayOrder,
          keyId,
          name: customerName || 'Order Payment',
          description: `Order #${draftOrder.id}`,
          prefillContact: customerPhone,
        });
        const verifyResult = await paymentService.verifyPayment(response);
        setConflicts(null);
        clearSavedCheckoutState();
        return {
          orderId: verifyResult.orderId,
          paymentStatus: verifyResult.success ? 'paid' : 'pending',
        };
      } catch (error) {
        const found = extractConflicts(error);
        if (found) {
          setConflicts(found);
          throw error;
        }

        // Something went wrong client-side after the point money could
        // have actually moved (the Razorpay modal opened) — a dropped
        // connection right as its handler fired, /verify timing out, the
        // tab nearly closing. Razorpay may still have captured the
        // payment even though this promise rejected, so check the order's
        // real state before telling the customer it failed: that's what
        // would otherwise send them to retry and risk paying twice.
        // Skipped for an explicit cancel/failure Razorpay itself reported
        // (see paymentService.openRazorpayCheckout) — those never reached
        // a state where money could have moved, so there's nothing to
        // reconcile and no reason to spend an extra round trip on it.
        const isDefiniteFailure =
          error?.message === 'Payment cancelled.' || error?.message === 'Payment failed.';
        if (!isDefiniteFailure) {
          try {
            const reconciled = await orderService.getOrderById(draftOrder.id);
            if (reconciled?.paymentStatus === 'paid') {
              setConflicts(null);
              clearSavedCheckoutState();
              return { orderId: reconciled.id, paymentStatus: 'paid' };
            }
          } catch {
            // The recovery check itself failed (e.g. also offline) — fall
            // through to the normal error path below.
          }
        }

        throw error;
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [draftOrder]
  );

  const canProceedToReview = !!selectedAddressId && draftStatus === 'ready' && !!draftOrder;
  // Gates the payment route/UI: everything canProceedToReview requires,
  // plus having actually confirmed that review for the current selection.
  // This is the check that stops address -> payment from skipping review.
  const canProceedToPayment = canProceedToReview && reviewConfirmed;
  const canPay =
    canProceedToPayment && typeof draftOrder?.total === 'number' && draftOrder.total > 0;

  const value = useMemo(
    () => ({
      step,
      goToStep,
      isRestoring,
      addresses,
      addressesStatus,
      loadAddresses,
      selectedAddressId,
      selectAddress,
      addAddress,
      editAddress,
      removeAddress,
      draftOrder,
      draftStatus,
      draftError,
      refreshDraftOrder,
      isPlacingOrder,
      placeCODOrder,
      payOnline,
      canProceedToReview,
      canProceedToPayment,
      reviewConfirmed,
      confirmReview,
      paymentMethod,
      setPaymentMethod,
      canPay,
      conflicts,
      clearConflicts,
    }),
    [
      step,
      goToStep,
      isRestoring,
      addresses,
      addressesStatus,
      loadAddresses,
      selectedAddressId,
      selectAddress,
      addAddress,
      editAddress,
      removeAddress,
      draftOrder,
      draftStatus,
      draftError,
      refreshDraftOrder,
      isPlacingOrder,
      placeCODOrder,
      payOnline,
      canProceedToReview,
      canProceedToPayment,
      reviewConfirmed,
      confirmReview,
      paymentMethod,
      setPaymentMethod,
      canPay,
      conflicts,
      clearConflicts,
    ]
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within a CheckoutProvider');
  return ctx;
}
