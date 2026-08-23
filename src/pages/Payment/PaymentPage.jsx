// src/pages/Payment/PaymentPage.jsx — Checkout step 3 "Payment"
// See design_handoff_advika_auto/README.md, screen 6 step 3. All
// data/guard logic below is unchanged from before the reskin (see
// CheckoutContext) — only the markup is new. The app has two real
// payment paths (Razorpay 'online' and 'cod'), not four — 'online' is
// shown as a UPI-first radio (Razorpay's own Checkout.js is where the
// customer actually picks UPI/Card/Netbanking) rather than fabricating
// three separate options with no distinct backend behaviour.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Icon from '@/components/Shared/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckout } from '@/contexts/CheckoutContext';
import { handleError } from '@/utils/errorHandler';
import CheckoutDarkSummary from '@/components/Checkout/CheckoutDarkSummary';
import OrderConflictsNotice from '@/components/Checkout/OrderConflictsNotice';
import PaymentStatusNotice from '@/components/Checkout/PaymentStatusNotice';
import { formatPrice } from '@/utils/productUtils';

const METHODS = [
  { id: 'online', icon: 'bolt', titleKey: 'advika.checkout.upiTitle', bodyKey: 'advika.checkout.upiBody' },
  { id: 'cod', icon: 'payments', titleKey: 'advika.checkout.codTitle', bodyKey: 'advika.checkout.codBody' },
];

export default function PaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    addresses, selectedAddressId, draftOrder, isPlacingOrder, placeCODOrder, payOnline,
    canProceedToReview, canProceedToPayment, canPay, conflicts, refreshDraftOrder,
    isRestoring, goToStep, paymentMethod: method, setPaymentMethod: setMethod,
  } = useCheckout();

  const [isRefreshingOrder, setIsRefreshingOrder] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);

  useEffect(() => { goToStep('payment'); }, [goToStep]);

  useEffect(() => {
    if (isRestoring) return;
    if (!canProceedToReview) navigate('/checkout', { replace: true });
    else if (!canProceedToPayment) navigate('/checkout/review', { replace: true });
  }, [isRestoring, canProceedToReview, canProceedToPayment, navigate]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const handlePlaceOrder = async () => {
    setPaymentNotice(null);
    try {
      if (method === 'cod') {
        const order = await placeCODOrder();
        navigate(`/order/success/${order.id}`, { state: { order, paymentMethod: 'cod', justPlaced: true } });
      } else {
        const { orderId, paymentStatus } = await payOnline({
          customerName: selectedAddress?.name || user?.phone,
          customerPhone: user?.phone,
        });
        navigate(`/order/success/${orderId}`, { state: { order: draftOrder, paymentMethod: 'online', paymentStatus, justPlaced: true } });
      }
    } catch (error) {
      const hasConflicts = !!error?.response?.data?.errors?.conflicts;
      if (hasConflicts) {
        handleError(error, t('checkout.orderFailed', "Couldn't place your order. Please try again."));
        return;
      }
      if (error?.reason === 'cancelled') {
        setPaymentNotice({ variant: 'cancelled', message: null });
        toast.info(t('checkout.paymentCancelledToast', 'Payment cancelled. No amount was charged.'));
      } else if (error?.reason === 'gateway_failed') {
        setPaymentNotice({ variant: 'failed', message: error.message });
      } else {
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

  const total = draftOrder.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {conflicts && <OrderConflictsNotice conflicts={conflicts} onRefresh={handleRefreshOrder} isRefreshing={isRefreshingOrder} />}
      {paymentNotice && <PaymentStatusNotice variant={paymentNotice.variant} message={paymentNotice.message} onDismiss={() => setPaymentNotice(null)} />}

      <div className="border border-advika-border-light bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="credit_card" size={19} className="text-advika-orange" />
          <h2 className="text-[15px] font-bold text-advika-chrome">{t('advika.checkout.paymentMethod', 'Payment Method')}</h2>
        </div>
        <div className="flex flex-col gap-[10px]">
          {METHODS.map((m) => {
            const selected = method === m.id;
            return (
              <label
                key={m.id}
                className={`flex items-center gap-3 rounded p-[13px] ${
                  selected ? 'border-[1.5px] border-advika-orange bg-advika-orange-tint' : 'border-[1.5px] border-advika-border-light bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={selected}
                  onChange={() => { setPaymentNotice(null); setMethod(m.id); }}
                  className="sr-only"
                />
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-advika-orange' : 'border-advika-grey400'}`}>
                  {selected && <span className="h-[9px] w-[9px] rounded-full bg-advika-orange" />}
                </span>
                <Icon name={m.icon} size={22} className={selected ? 'text-advika-orange' : 'text-advika-grey600'} />
                <span>
                  <span className={`block text-[14px] font-bold ${selected ? 'text-advika-orange-darker2' : 'text-advika-chrome'}`}>{t(m.titleKey)}</span>
                  <span className="block text-[11.5px] text-advika-grey700">{t(m.bodyKey)}</span>
                </span>
              </label>
            );
          })}
        </div>
        {method === 'cod' && (
          <div className="mt-3 rounded-[3px] border border-advika-success-border bg-advika-success-tint p-3">
            <p className="text-[11.5px] font-semibold text-advika-success-dark">
              {t('advika.checkout.codNote', { amount: formatPrice(total) })}
            </p>
          </div>
        )}
      </div>

      <CheckoutDarkSummary order={draftOrder} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate('/checkout/review')}
          disabled={isPlacingOrder}
          className="flex h-14 items-center justify-center gap-2 border-[1.5px] border-advika-grey400 px-5 text-[13px] font-bold text-advika-chrome disabled:opacity-60"
        >
          <Icon name="arrow_back" size={16} /> {t('advika.checkout.back', 'Back')}
        </button>
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={!canPay || isPlacingOrder || !!conflicts}
          className="flex h-14 flex-1 flex-col items-center justify-center bg-advika-orange text-white disabled:opacity-60"
        >
          <span className="text-[14px] font-bold">
            {isPlacingOrder
              ? t('checkout.placingOrder', 'Placing your order…')
              : method === 'cod'
                ? t('advika.checkout.placeOrder', 'PLACE ORDER')
                : paymentNotice
                  ? t('checkout.retryPayment', 'Retry payment')
                  : t('advika.checkout.payAmount', { amount: formatPrice(total) })}
          </span>
          {!isPlacingOrder && <span className="text-[9px] text-[#ffedd5]">{t('advika.checkout.securely', 'SECURELY')}</span>}
        </button>
      </div>
    </div>
  );
}
