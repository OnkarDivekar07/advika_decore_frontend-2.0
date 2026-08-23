// src/pages/OrderTracking/OrderTrackingPage.jsx — /orders/:orderId/track
//
// The durable Track Order screen (design_handoff_advika_auto/README.md
// screen 10). Unlike the old approach — reusing /order/success/:orderId
// and branching on router navigation `state` — this route is driven
// entirely by the :orderId URL param, so a refresh, a bookmark, or a
// shared link always resolves to the real current tracking state instead
// of silently regressing to the "just placed" success screen. See
// OrderSuccessPage.jsx, which now redirects here for any visit that
// isn't a fresh, in-app arrival from checkout.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import * as orderService from '@/services/orderService';
import * as shippingService from '@/services/shippingService';
import { getCategoryByLabel, BRAND_PHONE_TEL } from '@/config/advikaAuto';
import { formatPrice } from '@/utils/productUtils';
import {
  STAGES,
  STAGE_ICONS,
  resolveStageIndex,
  formatOrderDate,
  formatOrderDateTime,
  resolvePaymentMethod,
} from '@/utils/orderTrackingUtils';

export default function OrderTrackingPage() {
  const { t } = useTranslation();
  const { orderId } = useParams();

  const [state, setState] = useState('loading');
  const [order, setOrder] = useState(null);
  const [shipment, setShipment] = useState(null);

  const fetchOrder = useCallback(async () => {
    setState('loading');
    try {
      const fetched = await orderService.getOrderById(orderId);
      setOrder(fetched);
      setState('ready');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) setState('notFound');
      else if (status === 403) setState('forbidden');
      else setState('error');
    }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Best-effort — 'notFound' just means no Shipment row yet (admin hasn't
  // dispatched it), not an error; the timeline still renders from
  // order.status alone in that case.
  useEffect(() => {
    if (state !== 'ready' || !order || order.status === 'draft') return;
    let cancelled = false;
    shippingService.trackShipment(order.id)
      .then((s) => { if (!cancelled) setShipment(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [state, order]);

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
          <Icon name="error" size={40} className="text-advika-grey600" />
          <h1 className="font-archivoBlack text-[20px] text-advika-chrome">
            {state === 'notFound' ? t('orderSuccess.notFoundTitle', "We couldn't find that order") : t('orderSuccess.errorTitle', "Couldn't load your order")}
          </h1>
          <div className="flex gap-3">
            {state === 'error' && (
              <button type="button" onClick={fetchOrder} className="h-11 border-[1.5px] border-advika-chrome px-6 text-[13px] font-bold">
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

  const paymentMethod = resolvePaymentMethod(order, shipment);
  const stageIndex = resolveStageIndex(order.status, shipment?.status);
  const currentStage = STAGES[stageIndex];
  const orderItems = order.orderItems ?? [];
  // README's Domain rule table: "Checkout item meta — the meta line
  // reads '100W · 12V/24V'" — same voltage-aware meta used on the
  // Review step, carried through to this final surface.
  const itemMeta = (item) => {
    const parts = [
      t('orders.itemCount', 'Qty {{count}}', { count: item.quantity }),
      item.product?.specs?.Wattage,
      item.product?.voltage,
    ].filter(Boolean);
    return parts.join(' · ');
  };
  const deliveredStageKey = currentStage === 'delivered' && paymentMethod !== 'cod' ? 'deliveredOnline' : 'delivered';

  return (
    <div className="aa-shell min-h-screen bg-white">
      <Seo title={t('orderSuccess.detailsTitle', 'Order Details')} noindex />
      <AdvikaHeader />

      <div className="flex flex-col gap-[15px] bg-advika-near-black px-4 pb-[22px] pt-6">
        <Link to="/profile?tab=orders" className="aa-label flex items-center gap-1 text-[10.5px] text-advika-grey600">
          <Icon name="arrow_back" size={15} /> {t('advika.tracking.backToOrders', 'BACK TO MY ORDERS')}
        </Link>
        <h1 className="aa-title-lg text-white">
          {t('advika.tracking.titleLine1', 'TRACK')} <span className="text-advika-orange">{t('advika.tracking.titleAccent', 'ORDER')}</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="aa-mono text-[14px] text-advika-orange">#{order.id}</span>
          <span className="h-1 w-1 rounded-full bg-advika-grey700" />
          <span className="text-[11px] text-advika-grey600">{t('advika.tracking.placedOn', { date: formatOrderDate(order.createdAt).toUpperCase() })}</span>
        </div>
        <div className="flex items-center gap-[13px] rounded bg-advika-orange p-[15px]">
          <Icon name={STAGE_ICONS[currentStage]} size={30} className="text-white" />
          <div>
            <div className="aa-label text-[9.5px] text-[#ffe4cc]">{t('advika.tracking.currentStatus', 'CURRENT STATUS')}</div>
            <div className="text-[16px] font-bold text-white">{t(`advika.tracking.stage.${currentStage === 'delivered' ? deliveredStageKey : currentStage}.title`)}</div>
            <div className="text-[11.5px] text-[#fff3e6]">{t(`advika.tracking.stage.${currentStage === 'delivered' ? deliveredStageKey : currentStage}.body`)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-5">
        {/* Progress timeline */}
        <div className="border border-advika-border-light bg-white p-4">
          <h2 className="mb-3 text-[16px] font-bold text-advika-chrome">{t('advika.tracking.orderProgress', 'Order Progress')}</h2>
          <div className="flex flex-col">
            {STAGES.map((stage, idx) => {
              const isDone = idx < stageIndex;
              const isCurrent = idx === stageIndex;
              const isFuture = idx > stageIndex;
              const stageKey = stage === 'delivered' ? deliveredStageKey : stage;
              // No per-stage status-history table exists on the backend
              // yet (Order/Shipment only carry createdAt/updatedAt, not a
              // timestamp per stage transition) — only the two real
              // timestamps we actually have are shown: when the order
              // was placed, and when the shipment was last synced for
              // the current stage. Future/unknown stages show none
              // rather than a fabricated time.
              const stageTimestamp = stage === 'placed'
                ? formatOrderDateTime(order.createdAt)
                : isCurrent
                  ? formatOrderDateTime(shipment?.lastSyncedAt)
                  : '';
              return (
                <div key={stage} className="flex gap-[13px]">
                  <div className="flex w-8 shrink-0 flex-col items-center">
                    <span
                      className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 ${
                        isDone ? 'border-advika-success bg-advika-success' : isCurrent ? 'border-advika-orange bg-advika-orange' : 'border-2 border-advika-border-light bg-white'
                      }`}
                    >
                      {isDone ? (
                        <Icon name="check" size={17} className="text-white" />
                      ) : isCurrent ? (
                        <Icon name={STAGE_ICONS[stage]} size={17} className="text-white" />
                      ) : (
                        <Icon name="radio_button_unchecked" size={17} className="text-advika-grey400" />
                      )}
                    </span>
                    {idx < STAGES.length - 1 && (
                      <span className={`w-[2px] flex-1 ${idx < stageIndex ? 'bg-advika-success' : idx === stageIndex ? 'bg-advika-orange-border' : 'bg-advika-divider-light'}`} style={{ minHeight: 34 }} />
                    )}
                  </div>
                  <div className={`flex flex-col gap-1 ${idx < STAGES.length - 1 ? 'pb-5' : ''}`}>
                    <span className={`text-[14.5px] font-bold ${isFuture ? 'text-advika-grey600' : 'text-advika-chrome'}`}>
                      {t(`advika.tracking.stage.${stageKey}.title`)}
                    </span>
                    <span className={`text-[12px] ${isFuture ? 'text-advika-grey550' : 'text-advika-grey700'}`}>
                      {t(`advika.tracking.stage.${stageKey}.body`)}
                    </span>
                    {stageTimestamp && (
                      <span className="aa-mono text-[10.5px] text-advika-grey600">{stageTimestamp}</span>
                    )}
                    {isCurrent && (
                      <div className="mt-1 flex items-center gap-2 rounded-[3px] border border-advika-orange-border bg-advika-orange-tint2 px-[11px] py-[9px]">
                        <Icon name="schedule" size={15} className="text-advika-orange-dark" />
                        <span className="text-[11.5px] font-semibold text-advika-orange-darker2">
                          {paymentMethod === 'cod'
                            ? t('advika.tracking.currentCallout', { amount: (order.total ?? 0).toFixed(0) })
                            : t('advika.tracking.currentCalloutOnline', 'Arriving today between 2 PM and 7 PM.')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipment details */}
        {shipment && (
          <div className="border border-advika-border-light bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="local_shipping" size={19} className="text-advika-orange" />
              <h2 className="text-[15px] font-bold text-advika-chrome">{t('advika.tracking.shipmentDetails', 'Shipment Details')}</h2>
            </div>
            {[
              [t('advika.tracking.courier', 'COURIER'), shipment.courierPartner],
              [t('advika.tracking.trackingId', 'TRACKING ID'), shipment.trackingId],
              [t('advika.tracking.expected', 'EXPECTED'), formatOrderDate(shipment.estimatedDeliveryDate)],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between border-t border-advika-divider-light py-[10px] first:border-0 first:pt-0">
                <span className="w-[42%] text-[12.5px] text-advika-grey600">{label}</span>
                <span className="text-right text-[13px] font-semibold text-advika-grey900">{value}</span>
              </div>
            ))}
            <a href={BRAND_PHONE_TEL} className="mt-3 flex h-12 items-center justify-center bg-advika-whatsapp text-[13px] font-bold text-white">
              {t('advika.tracking.callAgent', 'CALL DELIVERY AGENT')}
            </a>
          </div>
        )}

        {/* Items */}
        <div className="border border-advika-border-light bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="inventory_2" size={19} className="text-advika-orange" />
            <h2 className="text-[15px] font-bold text-advika-chrome">{t('advika.tracking.itemsInOrder', 'Items in this Order')}</h2>
          </div>
          {orderItems.map((item) => {
            const category = getCategoryByLabel(item.product?.category?.[0]);
            return (
              <div key={item.id} className="flex items-center gap-3 border-t border-advika-divider-light py-3 first:border-0 first:pt-0">
                <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center bg-advika-ink">
                  <Icon name={category?.icon || 'auto_awesome'} size={26} className="text-advika-orange" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-advika-chrome">{item.product?.name ?? t('checkout.itemFallback', 'Item')}</p>
                  <p className="text-[10px] text-advika-grey700">{itemMeta(item)}</p>
                </div>
                <span className="aa-mono text-[14.5px] font-semibold text-advika-chrome">₹{formatPrice(item.price * item.quantity)}</span>
              </div>
            );
          })}
          <div className="mt-2 flex items-center justify-between border-t border-advika-border-light pt-3">
            <span className="text-[14px] font-bold text-advika-chrome">{t('advika.tracking.orderTotal', 'Order Total')}</span>
            <span className="aa-mono text-[18px] font-semibold text-advika-chrome">₹{formatPrice(order.total ?? 0)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-advika-success">
            <Icon name="payments" size={16} />
            <span className="text-[11.5px] font-semibold text-advika-success-dark">
              {paymentMethod === 'cod' ? t('orderSuccess.codPayLine', 'Cash on Delivery — pay when it arrives') : t('orderSuccess.paymentPaid', 'Paid')}
            </span>
          </div>
        </div>

        {/* Delivering to */}
        {order.address && (
          <div className="border border-advika-border-light bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="location_on" size={19} className="text-advika-orange" />
              <h2 className="text-[15px] font-bold text-advika-chrome">{t('advika.tracking.deliveringTo', 'Delivering To')}</h2>
            </div>
            <p className="border-t border-advika-divider-light pt-[11px] text-[14px] font-bold text-advika-chrome">{order.address.name}</p>
            <p className="text-[13px] text-advika-grey800">{order.address.houseArea}, {order.address.city}, {order.address.state} — {order.address.pincode}</p>
            {order.address.phone && <p className="aa-mono mt-1 text-[12.5px] text-advika-grey700">{order.address.phone}</p>}
          </div>
        )}

        {/* Help block */}
        <div className="flex items-center gap-[13px] rounded bg-advika-near-black p-4">
          <Icon name="support_agent" size={26} className="text-advika-orange" />
          <div className="flex-1">
            <p className="text-[13.5px] font-bold text-white">{t('advika.tracking.helpTitle', 'Problem with this order?')}</p>
            <p className="text-[11.5px] text-advika-grey600">{t('advika.tracking.helpBody')}</p>
          </div>
          <a href={BRAND_PHONE_TEL} className="shrink-0 rounded bg-advika-orange px-4 py-2 text-[12px] font-bold text-white">
            {t('advika.tracking.getHelp', 'GET HELP')}
          </a>
        </div>
      </div>
    </div>
  );
}
