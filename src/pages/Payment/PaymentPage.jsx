// src/pages/Payment/PaymentPage.jsx
//
// /checkout/payment (see AppRoutes.jsx) — the final step before an order
// exists. Deliberately just payment method + the total to pay: the address
// and full order breakdown were already the review step's job
// (ReviewPage.jsx); repeating an editable address recap here would let
// someone change what they're paying for without going back through
// review. Renders only what the draft-order response returned by
// CheckoutContext contains — never a locally recomputed total
// (checkout-architecture.md §2/§3.2 step 3-4), via the shared
// OrderSummaryCard. On success, navigates to /order/success/:orderId,
// optionally carrying what we already know as router state for an instant
// first paint — OrderSuccessPage re-fetches the order for real via
// orderService.getOrderById rather than trusting this hand-off, since it's
// the only thing that's authoritative once money may have moved.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckout } from '@/contexts/CheckoutContext';
import { handleError } from '@/utils/errorHandler';
import { toast } from 'react-toastify';
import OrderSummaryCard from '@/components/Checkout/OrderSummaryCard';
import OrderConflictsNotice from '@/components/Checkout/OrderConflictsNotice';
import PaymentStatusNotice from '@/components/Checkout/PaymentStatusNotice';

export default function PaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    addresses,
    selectedAddressId,
    draftOrder,
    isPlacingOrder,
    placeCODOrder,
    payOnline,
    canProceedToReview,
    canProceedToPayment,
    canPay,
    conflicts,
    refreshDraftOrder,
    isRestoring,
    goToStep,
    paymentMethod: method,
    setPaymentMethod: setMethod,
  } = useCheckout();

  const [isRefreshingOrder, setIsRefreshingOrder] = useState(false);
  // Set only for a *definite* online-payment outcome that wasn't success —
  // either Razorpay reporting the attempt itself failed ('failed') or the
  // customer closing the modal before attempting anything ('cancelled').
  // An ambiguous network hiccup never lands here — see handlePlaceOrder
  // below and CheckoutContext.payOnline's reconciliation step. Cleared on
  // every new attempt and on a payment-method switch, so it never lingers
  // across an unrelated action.
  const [paymentNotice, setPaymentNotice] = useState(null); // { variant: 'failed' | 'cancelled', message } | null

  // Keeps the persisted "current step" hint (see checkoutStorage.js) in
  // sync whenever this step is actually the one on screen.
  useEffect(() => {
    goToStep('payment');
  }, [goToStep]);

  // Route guard. Two distinct "not allowed here" cases, once any saved-
  // selection restore has settled:
  //  - no address/draft at all (hard refresh with nothing to resume, an
  //    address that was deleted from another tab, etc.) -> nothing to
  //    review either, so back to the address step.
  //  - address/draft ready but review was never confirmed for it (typed
  //    /checkout/payment directly, or an edit/reselect invalidated an
  //    earlier confirmation) -> back to review, not straight through.
  useEffect(() => {
    if (isRestoring) return;
    if (!canProceedToReview) {
      navigate('/checkout', { replace: true });
    } else if (!canProceedToPayment) {
      navigate('/checkout/review', { replace: true });
    }
  }, [isRestoring, canProceedToReview, canProceedToPayment, navigate]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const handlePlaceOrder = async () => {
    setPaymentNotice(null);
    try {
      if (method === 'cod') {
        const order = await placeCODOrder();
        navigate(`/order/success/${order.id}`, {
          state: { order, paymentMethod: 'cod' },
        });
      } else {
        const { orderId, paymentStatus } = await payOnline({
          customerName: selectedAddress?.name || user?.phone,
          customerPhone: user?.phone,
        });
        navigate(`/order/success/${orderId}`, {
          state: { order: draftOrder, paymentMethod: 'online', paymentStatus },
        });
      }
    } catch (error) {
      // A conflict (409, structured `errors.conflicts`) is already
      // surfaced persistently via the OrderConflictsNotice below — the
      // toast is still useful as an immediate signal, but the banner is
      // what actually tells the customer what changed and how to recover.
      // Checked directly off the error's own shape (same check
      // CheckoutContext's extractConflicts uses), not the `conflicts`
      // state above — that state was only just set (if at all) inside
      // payOnline/placeCODOrder moments ago and hasn't re-rendered into
      // this closure yet.
      const hasConflicts = !!error?.response?.data?.errors?.conflicts;
      if (hasConflicts) {
        handleError(error, t('checkout.orderFailed', "Couldn't place your order. Please try again."));
        return;
      }

      // Online payment, tagged by paymentService.openRazorpayCheckout /
      // CheckoutContext.payOnline (see RazorpayCheckoutError). Both are
      // *definite* outcomes — no amount was charged either way, and the
      // draft order/Razorpay order underneath is untouched (see
      // payment.controller.js's createOrderid reuse-or-reconcile) — so
      // both are safe to just retry from right here:
      //  - 'cancelled'      the customer backed out themselves before
      //                     attempting anything. Nothing went wrong, so
      //                     this gets a neutral (not error-styled) banner
      //                     plus a plain info toast, not an error one.
      //  - 'gateway_failed' Razorpay definitively rejected the attempt
      //                     (card declined, UPI failed, etc.) — surfaced
      //                     as an actual alert banner, since the customer
      //                     needs to actually read and act on it (e.g.
      //                     try a different card, or switch to COD)
      //                     before trying again.
      if (error?.reason === 'cancelled') {
        setPaymentNotice({ variant: 'cancelled', message: null });
        toast.info(t('checkout.paymentCancelledToast', 'Payment cancelled. No amount was charged.'));
      } else if (error?.reason === 'gateway_failed') {
        setPaymentNotice({ variant: 'failed', message: error.message });
      } else {
        // Ambiguous failure that reconciliation (in payOnline) couldn't
        // resolve either way — COD's own placement error, a plain network
        // failure, etc. Same toast as before; not definite enough to
        // brand as a payment outcome specifically.
        handleError(error, t('checkout.orderFailed', "Couldn't place your order. Please try again."));
      }
    }
  };

  const handleRefreshOrder = async () => {
    if (!selectedAddressId) return;
    setIsRefreshingOrder(true);
    try {
      await refreshDraftOrder(selectedAddressId);
    } finally {
      setIsRefreshingOrder(false);
    }
  };

  if (!draftOrder || !canProceedToPayment) return null;

  return (
    <div className="flex flex-col gap-6">
      {conflicts && (
        <OrderConflictsNotice
          conflicts={conflicts}
          onRefresh={handleRefreshOrder}
          isRefreshing={isRefreshingOrder}
        />
      )}

      {paymentNotice && (
        <PaymentStatusNotice
          variant={paymentNotice.variant}
          message={paymentNotice.message}
          onDismiss={() => setPaymentNotice(null)}
        />
      )}

      {/* Read-only recap — changing the address is a review-step action
          (see ReviewPage.jsx), not available from here. */}
      {selectedAddress && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-1">
            {t('checkout.deliverTo', 'Deliver to')}
          </h2>
          <p className="font-semibold text-gray-900">{selectedAddress.name}</p>
          <p className="text-sm text-gray-600">
            {selectedAddress.houseArea}, {selectedAddress.city}, {selectedAddress.state} —{' '}
            {selectedAddress.pincode}
          </p>
        </section>
      )}

      <OrderSummaryCard order={draftOrder} />

      {/* Payment method */}
      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold text-gray-900">
          {t('checkout.paymentMethod', 'Payment Method')}
        </h2>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--clr-border)] cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            checked={method === 'online'}
            onChange={() => {
              setPaymentNotice(null);
              setMethod('online');
            }}
          />
          <span className="text-sm font-medium text-gray-800">
            {t('checkout.payOnline', 'Pay online (UPI / Card / Netbanking)')}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--clr-border)] cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            checked={method === 'cod'}
            onChange={() => {
              setPaymentNotice(null);
              setMethod('cod');
            }}
          />
          <span className="text-sm font-medium text-gray-800">
            {t('checkout.payCod', 'Cash on Delivery')}
          </span>
        </label>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => navigate('/checkout/review')}
          disabled={isPlacingOrder}
          className="btn btn-outline sm:w-auto px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FiArrowLeft className="w-4 h-4" aria-hidden />
          {t('checkout.back', 'Back')}
        </button>
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={!canPay || isPlacingOrder || !!conflicts}
          className="btn btn-primary flex-1 py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPlacingOrder
            ? t('checkout.placingOrder', 'Placing your order…')
            : method === 'cod'
              ? t('checkout.placeOrder', 'Place Order')
              : paymentNotice
                ? t('checkout.retryPayment', 'Retry payment')
                : t('checkout.payAmount', 'Pay ₹{{amount}}', { amount: (draftOrder.total ?? 0).toFixed(2) })}
        </button>
      </div>
    </div>
  );
}
