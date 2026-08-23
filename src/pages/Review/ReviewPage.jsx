// src/pages/Review/ReviewPage.jsx — Checkout step 2 "Review"
// See design_handoff_advika_auto/README.md, screen 6 step 2. All data/
// guard logic below is unchanged from before the reskin (see
// CheckoutContext) — only the markup is new.
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Spinner from '@/components/Shared/Spinner';
import { useCheckout } from '@/contexts/CheckoutContext';
import CheckoutDarkSummary from '@/components/Checkout/CheckoutDarkSummary';
import OrderConflictsNotice from '@/components/Checkout/OrderConflictsNotice';
import ServiceabilityMessage from '@/components/Shipping/ServiceabilityMessage';
import { formatDeliveryDate } from '@/utils/formatDeliveryDate';
import { useServiceabilityCheck } from '@/features/shipping/hooks/useServiceabilityCheck';
import { getCategoryByLabel, getVoltageInfo } from '@/config/advikaAuto';
import { formatPrice } from '@/utils/productUtils';

const FALLBACK_ITEM_WEIGHT_KG = 0.5;

export default function ReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    addresses, selectedAddressId, draftOrder, isRestoring, canProceedToReview,
    confirmReview, conflicts, refreshDraftOrder, goToStep,
  } = useCheckout();

  const [isRefreshingOrder, setIsRefreshingOrder] = React.useState(false);

  useEffect(() => { goToStep('review'); }, [goToStep]);

  useEffect(() => {
    if (isRestoring) return;
    if (!canProceedToReview) navigate('/checkout', { replace: true });
  }, [isRestoring, canProceedToReview, navigate]);

  useEffect(() => {
    if (isRestoring || !selectedAddressId) return;
    refreshDraftOrder(selectedAddressId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestoring, selectedAddressId]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const orderItems = useMemo(() => draftOrder?.orderItems ?? [], [draftOrder?.orderItems]);
  const itemsSignature = useMemo(
    () => orderItems.map((item) => `${item.productId ?? item.product?.id ?? item.id}:${item.quantity}`).sort().join('|'),
    [orderItems]
  );
  const cartWeightKg = useMemo(
    () => orderItems.reduce((sum, item) => sum + FALLBACK_ITEM_WEIGHT_KG * (item.quantity || 0), 0),
    [orderItems]
  );

  const { status: shippingStatus, data: deliveryEstimate, retry: retryShippingCheck } = useServiceabilityCheck(
    selectedAddress?.pincode,
    {
      debounceMs: 0,
      enabled: !!selectedAddress?.pincode,
      weightKg: cartWeightKg || undefined,
      subtotal: typeof draftOrder?.subtotal === 'number' ? draftOrder.subtotal : undefined,
      recalcKey: itemsSignature,
    }
  );

  const shippingUnserviceable = shippingStatus === 'ready' && deliveryEstimate?.serviceable === false;
  const shippingCheckPending = shippingStatus === 'checking';
  const shippingCheckFailed = shippingStatus === 'error';
  const shippingBlocksProceed = shippingCheckPending || shippingCheckFailed || shippingUnserviceable;

  const handleRefreshOrder = async () => {
    if (!selectedAddressId) return;
    setIsRefreshingOrder(true);
    try {
      await refreshDraftOrder(selectedAddressId);
    } finally {
      setIsRefreshingOrder(false);
    }
  };

  const handleProceed = () => {
    if (!canProceedToReview) return;
    confirmReview();
    navigate('/checkout/payment');
  };

  if (isRestoring || !draftOrder) {
    return <div className="flex justify-center py-24"><Spinner size={40} /></div>;
  }

  const deliveryLabel = (() => {
    if (!(shippingStatus === 'ready' && deliveryEstimate?.serviceable)) return null;
    const formattedDate = formatDeliveryDate(deliveryEstimate.estimatedDeliveryDate);
    if (formattedDate) return t('advika.checkout.expectedDelivery', { date: formattedDate });
    if (deliveryEstimate.estimatedDays) return t('checkout.deliversIn', 'Delivers in ~{{days}} days', { days: deliveryEstimate.estimatedDays });
    return null;
  })();

  return (
    <div className="flex flex-col gap-4">
      {conflicts && <OrderConflictsNotice conflicts={conflicts} onRefresh={handleRefreshOrder} isRefreshing={isRefreshingOrder} />}

      {/* Order items */}
      <div className="border border-advika-border-light bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="inventory_2" size={19} className="text-advika-orange" />
          <h2 className="text-[15px] font-bold text-advika-chrome">{t('advika.checkout.orderItems', 'Order items')}</h2>
        </div>
        <div className="flex flex-col">
          {orderItems.map((item) => {
            const category = getCategoryByLabel(item.product?.category?.[0]);
            const voltage = getVoltageInfo(item.product);
            // README's "Domain rule: 12V vs 24V" table: "Checkout item
            // meta — the meta line reads '100W · 12V/24V' so voltage
            // survives all the way to the order review."
            const metaParts = [
              t('orders.itemCount', 'Qty {{count}}', { count: item.quantity }),
              item.product?.specs?.Wattage,
              voltage.hasVoltage ? voltage.label : null,
            ].filter(Boolean);
            return (
              <div key={item.id} className="flex items-center gap-3 border-t border-advika-divider-light py-3 first:border-0 first:pt-0">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center bg-advika-ink">
                  <Icon name={category?.icon || 'auto_awesome'} size={26} className="text-advika-orange" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-advika-chrome">{item.product?.name ?? t('checkout.itemFallback', 'Item')}</p>
                  <p className="text-[10px] text-advika-grey700">{metaParts.join(' · ')}</p>
                </div>
                <span className="aa-mono shrink-0 text-[15px] font-semibold text-advika-chrome">₹{formatPrice(item.price * item.quantity)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivering to */}
      <div className="border border-advika-border-light bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="local_shipping" size={19} className="text-advika-orange" />
          <h2 className="text-[15px] font-bold text-advika-chrome">{t('advika.checkout.deliveringTo', 'Delivering to')}</h2>
        </div>
        {selectedAddress ? (
          <>
            <p className="text-[14px] font-bold text-advika-chrome">{selectedAddress.name}</p>
            <p className="text-[13px] leading-[1.55] text-advika-grey800">
              {selectedAddress.houseArea}, {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}
            </p>
            <button type="button" onClick={() => navigate('/checkout')} className="mt-2 text-[12.5px] font-semibold text-advika-orange-dark">
              {t('advika.checkout.changeAddress', 'Change address')}
            </button>

            {shippingCheckPending && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-advika-grey700" role="status">
                <Spinner size={12} /> {t('checkout.checkingServiceability', 'Checking delivery availability…')}
              </p>
            )}
            {(shippingCheckFailed || shippingUnserviceable) && (
              <ServiceabilityMessage
                status={shippingStatus} data={deliveryEstimate}
                onRetry={shippingCheckFailed ? retryShippingCheck : undefined} isRetrying={shippingCheckPending} className="mt-2"
              />
            )}
            {deliveryLabel && (
              <div className="mt-3 flex items-center gap-2 rounded-[3px] border border-advika-orange-border bg-advika-orange-tint2 p-3">
                <Icon name="event_available" size={18} className="text-advika-orange-dark" />
                <div>
                  <p className="text-[12.5px] font-semibold text-advika-orange-darker2">{deliveryLabel}</p>
                  <p className="text-[11px] text-advika-orange-darker">{t('advika.checkout.freeShipping', 'FREE SHIPPING')}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-advika-grey700">{t('checkout.addressOnFile', 'Address on file')}</p>
        )}
      </div>

      {canProceedToReview && shippingUnserviceable && (
        <p className="text-center text-[12px] text-advika-warning" role="alert">
          {t('checkout.cannotProceedUnserviceable', "We can't confirm delivery to this address. Choose a different address to continue.")}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="flex h-[52px] items-center justify-center gap-2 border-[1.5px] border-advika-grey400 px-5 text-[13px] font-bold text-advika-chrome"
        >
          <Icon name="arrow_back" size={16} /> {t('advika.checkout.back', 'Back')}
        </button>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!canProceedToReview || !!conflicts || shippingBlocksProceed}
          className="flex h-[52px] flex-1 items-center justify-center bg-advika-orange text-[13px] font-bold text-white disabled:opacity-60"
        >
          {shippingCheckPending ? t('checkout.checkingServiceability', 'Checking delivery availability…') : t('advika.checkout.proceedToPayment', 'PROCEED TO PAYMENT')}
        </button>
      </div>

      <CheckoutDarkSummary order={draftOrder} />
    </div>
  );
}
