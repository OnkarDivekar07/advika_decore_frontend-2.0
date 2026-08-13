// src/pages/OrderSuccess/OrderSuccessPage.jsx
//
// /order/success/:orderId (see AppRoutes.jsx). Reached from PaymentPage
// after COD placement or a Razorpay Checkout.js callback + /verify — but
// deliberately doesn't trust what PaymentPage forwarded as the final word.
// Router state can be empty (direct link, bookmarked, refreshed, shared),
// and even when present it's only ever a best-effort snapshot: the COD
// response is solid (nothing async left to happen), but the online-payment
// response is just "here's an orderId and what /verify best-effort saw" —
// the Razorpay webhook is the real backstop and can still flip
// paymentStatus after this page has already rendered (checkout-
// architecture.md §1/§3.2 step 4).
//
// So this page fetches the order for real via the customer-scoped
// GET /api/order/:id (orderService.getOrderById) and treats that response
// as the only source of truth for what's shown. If payment is still
// reconciling, this polls a few times (the webhook is usually near-instant,
// but not guaranteed to have landed by the time Razorpay's client-side
// callback returns) before settling into a "still processing" state that
// no longer refreshes itself.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiClock, FiAlertTriangle, FiXCircle } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import Spinner from '@/components/Shared/Spinner';
import ShipmentStatusCard from '@/components/Shipping/ShipmentStatusCard';
import OrderSummaryCard from '@/components/Checkout/OrderSummaryCard';
import { useCart } from '@/contexts/CartContext';
import * as orderService from '@/services/orderService';

// How many times to re-poll GET /api/order/:id while the order's payment
// attempt is still unresolved for an online payment, and how far apart.
// The Razorpay webhook is usually near-instant; this window just covers the
// gap between this page mounting and the webhook landing, not a general
// "wait for slow payments" mechanism.
const PENDING_POLL_ATTEMPTS = 5;
const PENDING_POLL_INTERVAL_MS = 2500;

// paymentStatus values that mean "still working on it, not resolved yet" —
// see payment.service.js's PaymentStatus state machine. createOrderid moves
// a fresh draft straight to 'attempted' once a Razorpay order is minted
// (well before this page's poll ever starts), so a plain 'pending' here
// would only happen if /verify was never reached; included for completeness.
const UNRESOLVED_PAYMENT_STATUSES = ['pending', 'attempted', 'processing'];
// Terminal states where payment did NOT succeed — shown the same way as a
// definite failure, with a "retry payment" affordance.
const FAILED_LIKE_PAYMENT_STATUSES = ['failed', 'cancelled', 'timeout', 'unknown'];

export default function OrderSuccessPage() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const location = useLocation();
  const { paymentMethod: methodHint } = location.state || {};
  const { retryLoadCart } = useCart();

  // 'loading' | 'ready' | 'notFound' | 'forbidden' | 'error'
  const [state, setState] = useState('loading');
  const [order, setOrder] = useState(null);
  const pollAttemptsRef = useRef(0);
  const pollTimerRef = useRef(null);

  const fetchOrder = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setState('loading');
      try {
        const fetched = await orderService.getOrderById(orderId);
        setOrder(fetched);
        setState('ready');
        return fetched;
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404) setState('notFound');
        else if (status === 403) setState('forbidden');
        else setState('error');
        return null;
      }
    },
    [orderId]
  );

  useEffect(() => {
    fetchOrder();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Only relevant for the online-payment path: if the order we just
  // fetched is still unresolved (webhook/verify hasn't reconciled it yet),
  // poll a few more times before settling into the static "processing"
  // state below — each successful poll replaces `order` wholesale, so as
  // soon as the webhook lands this flips to 'paid' (or a failed-like state)
  // on its own.
  useEffect(() => {
    if (state !== 'ready' || !order) return;
    if (!UNRESOLVED_PAYMENT_STATUSES.includes(order.paymentStatus)) return;
    if (pollAttemptsRef.current >= PENDING_POLL_ATTEMPTS) return;

    pollTimerRef.current = setTimeout(() => {
      pollAttemptsRef.current += 1;
      fetchOrder({ silent: true });
    }, PENDING_POLL_INTERVAL_MS);

    return () => clearTimeout(pollTimerRef.current);
  }, [state, order, fetchOrder]);

  // The backend clears the cart server-side once an order is confirmed
  // (COD placed, or payment verified/captured — see
  // checkout-architecture.md §1). Pulling a fresh cart here reflects that
  // straight away instead of leaving stale items in memory until the next
  // focus/visibility-triggered reconcile.
  useEffect(() => {
    retryLoadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center gap-4">
          <Spinner size={40} />
          <p className="text-sm text-gray-400">
            {t('orderSuccess.loading', 'Loading your order…')}
          </p>
        </main>
      </>
    );
  }

  if (state === 'notFound' || state === 'forbidden' || state === 'error') {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <FiAlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" aria-hidden />
          <h1 className="section-title mb-2">
            {state === 'notFound'
              ? t('orderSuccess.notFoundTitle', "We couldn't find that order")
              : state === 'forbidden'
                ? t('orderSuccess.forbiddenTitle', "That order isn't linked to this account")
                : t('orderSuccess.errorTitle', "Couldn't load your order")}
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            {state === 'error'
              ? t('orderSuccess.errorBody', 'Please check your connection and try again.')
              : t(
                  'orderSuccess.notFoundBody',
                  'If you just placed this order, check the order confirmation link you were sent, or view your orders.'
                )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {state === 'error' && (
              <button onClick={() => fetchOrder()} className="btn btn-outline px-6">
                {t('checkout.retry', 'Retry')}
              </button>
            )}
            <Link to="/" className="btn btn-primary px-6">
              {t('orderSuccess.continueShopping', 'Continue Shopping')}
            </Link>
          </div>
        </main>
      </>
    );
  }

  // paymentMethod is inferred from the authoritative order whenever
  // possible (payment_order_id starting with 'cod-' — see
  // payment.service.js's handleCODOrder), falling back to what
  // PaymentPage hinted via router state only for the brief window before
  // that convention is worth relying on for display copy.
  const paymentMethod = order.payment_order_id?.startsWith('cod-') ? 'cod' : (methodHint ?? 'online');
  const isProcessing = paymentMethod !== 'cod' && UNRESOLVED_PAYMENT_STATUSES.includes(order.paymentStatus);
  // The webhook is the source of truth for a definite failure (see
  // payment.service.js's handleRazorpayWebhookEvent, case 'payment.failed')
  // — reachable here whenever the customer left this page (or the app)
  // before /verify could run, and the failure only got reconciled after the
  // fact. A failure caught client-side, in the same tab, is instead handled
  // right on PaymentPage (see PaymentStatusNotice there) and never navigates
  // here at all. 'cancelled'/'timeout'/'unknown' land here the same way —
  // none of them mean payment succeeded, so they get the same "didn't go
  // through, retry available" treatment. A plain in-tab *cancel* (customer
  // closed the modal without attempting anything) never reaches this page
  // at all — it's handled entirely on PaymentPage — but a cancel discovered
  // later (e.g. this order's link revisited) is shown the same as any other
  // non-success outcome.
  const isFailed = paymentMethod !== 'cod' && FAILED_LIKE_PAYMENT_STATUSES.includes(order.paymentStatus);
  // Once money has actually moved (paid) or COD has been confirmed, the
  // order itself is no longer 'draft' — safe to check for a shipment.
  // While still pending/failed, an admin hasn't confirmed/shipped
  // anything yet (a failed order stays 'draft', same as pending — see
  // payment.service.js), so skip the check rather than surfacing a
  // guaranteed 404.
  const canShowShipment = order.status !== 'draft' && !isProcessing && !isFailed;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        {isFailed ? (
          <FiXCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" aria-hidden />
        ) : isProcessing ? (
          <FiClock className="w-16 h-16 text-amber-400 mx-auto mb-4" aria-hidden />
        ) : (
          <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden />
        )}

        <h1 className="section-title mb-2">
          {isFailed
            ? t('orderSuccess.failedTitle', 'Payment failed')
            : isProcessing
              ? t('orderSuccess.processingTitle', "We're confirming your payment")
              : t('orderSuccess.title', 'Order placed!')}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {isFailed
            ? t(
                'orderSuccess.failedBody',
                "This payment didn't go through, so your order hasn't been placed. No amount was charged — you can pick up where you left off and try again."
              )
            : isProcessing
              ? t(
                  'orderSuccess.processingBody',
                  "Your payment is being confirmed. You'll be notified as soon as it's done — no need to retry."
                )
              : paymentMethod === 'cod'
                ? t('orderSuccess.codBody', "Pay ₹{{amount}} in cash when it's delivered.", {
                    amount: (order.total ?? 0).toFixed(2),
                  })
                : t('orderSuccess.paidBody', 'Your payment was received and your order is confirmed.')}
        </p>

        <div className="flex justify-between text-sm text-gray-600 mb-4 max-w-md mx-auto">
          <span>{t('orderSuccess.orderId', 'Order ID')}</span>
          <span className="font-mono text-gray-900">{order.id}</span>
        </div>

        <div className="mx-auto max-w-md text-left">
          <OrderSummaryCard order={order} />
        </div>

        {/* Shipment isn't created until the order is actually confirmed
            (see shipping.service.js) — skip the check while payment is
            still being confirmed/failed rather than surfacing a
            guaranteed 404. */}
        {canShowShipment && <ShipmentStatusCard orderId={order.id} />}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          {isFailed && (
            // Same draft order, same reusable Razorpay order id (see
            // payment.controller.js's createOrderid reuse-or-reconcile) —
            // going back through /checkout/payment picks up exactly where
            // this attempt left off rather than starting over.
            <Link to="/checkout/payment" className="btn btn-primary px-6">
              {t('orderSuccess.retryPayment', 'Retry payment')}
            </Link>
          )}
          <Link to="/" className={isFailed ? 'btn btn-outline px-6' : 'btn btn-primary px-6'}>
            {t('orderSuccess.continueShopping', 'Continue Shopping')}
          </Link>
        </div>
      </main>
    </>
  );
}
