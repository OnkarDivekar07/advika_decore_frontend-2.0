// src/pages/OrderSuccess/OrderSuccessPage.jsx
// /order/success/:orderId — the fresh-checkout success screen (screen 6
// step 4: "ORDER PLACED!"), plus the payment failed/processing edge
// cases. This is inherently a one-time "thank you" screen reached by
// in-app navigation right after PaymentPage places an order (which
// passes `state.justPlaced`, see PaymentPage.jsx's handlePlaceOrder) —
// not a durable, bookmarkable page. Any other arrival here (a hard
// refresh, a stale bookmark, a shared link — anything where
// `state.justPlaced` isn't present) redirects to the real durable
// tracking page, OrderTrackingPage.jsx at /orders/:orderId/track,
// instead of re-showing "ORDER PLACED!" for an order that may be long
// since delivered.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import PaymentInfoCard from '@/components/Orders/PaymentInfoCard';
import { useCart } from '@/contexts/CartContext';
import * as orderService from '@/services/orderService';
import { formatPrice } from '@/utils/productUtils';
import { resolvePaymentMethod } from '@/utils/orderTrackingUtils';

const PENDING_POLL_ATTEMPTS = 5;
const PENDING_POLL_INTERVAL_MS = 2500;
const UNRESOLVED_PAYMENT_STATUSES = ['pending', 'attempted', 'processing'];
const FAILED_LIKE_PAYMENT_STATUSES = ['failed', 'cancelled', 'timeout', 'unknown'];

export default function OrderSuccessPage() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const location = useLocation();
  const { justPlaced } = location.state || {};
  const { retryLoadCart } = useCart();

  const [state, setState] = useState('loading');
  const [order, setOrder] = useState(null);
  const pollAttemptsRef = React.useRef(0);
  const pollTimerRef = React.useRef(null);

  const fetchOrder = useCallback(async ({ silent } = {}) => {
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
  }, [orderId]);

  useEffect(() => {
    if (!justPlaced) return; // redirecting below — no need to fetch here
    fetchOrder();
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, justPlaced]);

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

  useEffect(() => {
    if (!justPlaced) return;
    retryLoadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPlaced]);

  if (!justPlaced) {
    return <Navigate to={`/orders/${orderId}/track`} replace />;
  }

  if (state === 'loading') {
    return (
      <div className="aa-shell flex min-h-screen items-center justify-center bg-white">
        <Seo title={t('orderSuccess.loading', 'Loading your order…')} noindex />
        <Spinner size={40} />
      </div>
    );
  }

  if (state === 'notFound' || state === 'forbidden' || state === 'error') {
    return (
      <div className="aa-shell min-h-screen bg-white">
        <AdvikaHeader />
        <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
          <Icon name="error" size={40} className="text-advika-grey650" />
          <h1 className="font-archivoBlack text-[20px] text-advika-chrome">
            {state === 'notFound' ? t('orderSuccess.notFoundTitle', "We couldn't find that order") : t('orderSuccess.errorTitle', "Couldn't load your order")}
          </h1>
          <div className="flex gap-3">
            {state === 'error' && (
              <button type="button" onClick={() => fetchOrder()} className="h-11 border-[1.5px] border-advika-chrome px-6 text-[13px] font-bold">
                {t('checkout.retry', 'Retry')}
              </button>
            )}
            <Link to="/" className="flex h-11 items-center bg-advika-orange px-6 text-[13px] font-bold text-white">
              {t('orderSuccess.continueShopping', 'Continue Shopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paymentMethod = resolvePaymentMethod(order, null);
  const isProcessing = paymentMethod !== 'cod' && UNRESOLVED_PAYMENT_STATUSES.includes(order.paymentStatus);
  const isFailed = paymentMethod !== 'cod' && FAILED_LIKE_PAYMENT_STATUSES.includes(order.paymentStatus);

  // --- Fresh checkout success (screen 6 step 4) ---------------------------
  if (!isFailed && !isProcessing) {
    return (
      <div className="aa-shell min-h-screen bg-white">
        <Seo title={t('orderSuccess.title', 'Order placed!')} noindex />
        <div className="flex flex-col items-center gap-[14px] px-5 pb-8 pt-11 text-center">
          <span className="flex h-[78px] w-[78px] items-center justify-center rounded-2xl bg-advika-success">
            <Icon name="check_circle" size={44} className="text-white" />
          </span>
          <h1 className="font-archivoBlack text-[27px] text-advika-chrome">{t('advika.checkout.orderPlaced', 'ORDER PLACED!')}</h1>
          <p className="text-[14px] text-advika-chrome">{t('advika.checkout.orderNumber', { id: order.id })}</p>
          <p className="text-[12px] text-advika-orange-dark">
            {paymentMethod === 'cod'
              ? t('orderSuccess.codBody', "Pay ₹{{amount}} in cash when it's delivered.", { amount: formatPrice(order.total ?? 0) })
              : t('orderSuccess.paidBody', 'Your payment was received and your order is confirmed.')}
          </p>
          <div className="mt-2 flex w-full items-center gap-3 border border-advika-border-light bg-white p-4 text-left">
            <Icon name="inventory" size={21} className="text-advika-orange" />
            <div>
              <p className="text-[13.5px] font-bold text-advika-chrome">{t('advika.checkout.packedInfo', 'Your items are being packed')}</p>
              <p className="text-[11.5px] text-advika-grey700">{t('advika.checkout.smsUpdates', { phone: `+91 ${order.address?.phone ? order.address.phone.slice(-10) : ''}` })}</p>
            </div>
          </div>
          {/* Delivery estimate — README screen 6 step 4: `t.expectedDelivery`
              sits between the order number and the packed-info card. No
              per-order delivery-estimate field is persisted on Order
              (only Shipment.estimatedDeliveryDate, set once a shipment
              exists — not yet, this soon after placing) — this states
              the storefront's one universal shipping SLA (ticker, trust
              strip, checkout note all promise the same "3-4 days")
              rather than fabricating a per-order date with nothing
              behind it. */}
          <p className="text-[12px] font-semibold text-advika-orange-dark">
            {t('advika.checkout.expectedDeliveryGeneric', 'Expected delivery in 3-4 days')}
          </p>
          <Link to={`/orders/${order.id}/track`} className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 border-[1.5px] border-advika-chrome text-[14px] font-bold text-advika-chrome">
            {t('advika.checkout.trackMyOrder', 'TRACK MY ORDER')}
          </Link>
          <Link to="/" className="flex h-[52px] w-full items-center justify-center bg-advika-orange text-[14px] font-bold text-white">
            {t('advika.checkout.continueShopping', 'CONTINUE SHOPPING')}
          </Link>
        </div>
      </div>
    );
  }

  // --- Payment failed / processing (edge case, not a wireframe screen —
  // kept functional with lightweight Advika Auto styling) ------------------
  return (
    <div className="aa-shell min-h-screen bg-white">
      <AdvikaHeader />
      <Seo title={isFailed ? t('orderSuccess.failedTitle', 'Payment failed') : t('orderSuccess.processingTitle', "We're confirming your payment")} noindex />
      <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
        <Icon name={isFailed ? 'cancel' : 'schedule'} size={48} className={isFailed ? 'text-advika-danger' : 'text-advika-warning'} />
        <h1 className="font-archivoBlack text-[22px] text-advika-chrome">
          {isFailed ? t('orderSuccess.failedTitle', 'Payment failed') : t('orderSuccess.processingTitle', "We're confirming your payment")}
        </h1>
        <p className="max-w-xs text-[13.5px] text-advika-grey700">
          {isFailed
            ? t('orderSuccess.failedBody', "This payment didn't go through, so your order hasn't been placed. No amount was charged.")
            : t('orderSuccess.processingBody', "Your payment is being confirmed. You'll be notified as soon as it's done.")}
        </p>
        <PaymentInfoCard order={order} paymentMethod={paymentMethod} isFailed={isFailed} isProcessing={isProcessing} />
        <div className="flex gap-3">
          {isFailed && (
            <Link to="/checkout/payment" className="flex h-11 items-center bg-advika-orange px-6 text-[13px] font-bold text-white">
              {t('orderSuccess.retryPayment', 'Retry payment')}
            </Link>
          )}
          <Link to="/" className="flex h-11 items-center border-[1.5px] border-advika-chrome px-6 text-[13px] font-bold text-advika-chrome">
            {t('orderSuccess.continueShopping', 'Continue Shopping')}
          </Link>
        </div>
      </div>
    </div>
  );
}
