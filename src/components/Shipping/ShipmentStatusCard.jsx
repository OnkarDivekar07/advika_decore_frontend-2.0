// src/components/Shipping/ShipmentStatusCard.jsx
//
// Shows the current shipment status for an order (see shippingService.js /
// shipping.routes.js), fronted by OrderTrackingTimeline's visual
// Placed -> Confirmed -> Shipped -> Out for Delivery -> Delivered stepper
// (PHASE 12 — order tracking). The backend polls Delhivery live on every
// GET /track call and persists whatever it gets back — the Delhivery webhook
// is the real source of truth for status changes, same role the Razorpay
// webhook plays for payment (checkout-architecture.md §1) — so this
// component never derives status itself, only displays the last thing the
// backend returned and offers a manual refresh.
//
// A confirmed order doesn't get a Shipment record until an admin
// triggers shipment creation, so "no shipment yet" is the normal state
// right after checkout, not an error — the timeline still renders in that
// case (driven by `orderStatus` alone, since that's already known from the
// order detail fetch one level up), just without the tracking-id/location/
// ETA detail rows a live Shipment record would add.
import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiRefreshCw, FiCalendar } from 'react-icons/fi';
import * as shippingService from '@/services/shippingService';
import { handleError } from '@/utils/errorHandler';
import { formatDeliveryDate } from '@/utils/formatDeliveryDate';
import OrderTrackingTimeline from '@/components/Shipping/OrderTrackingTimeline';

// Once a shipment has reached one of these, "estimated delivery" no longer
// means anything useful — it's either already happened or isn't going to.
const TERMINAL_STATUSES = new Set(['DELIVERED', 'RTO_INITIATED', 'RTO_DELIVERED', 'CANCELLED']);

const CANCELLABLE_STATUSES = new Set([
  'CREATED',
  'PICKED_UP',
  'IN_TRANSIT',
]);

const STATUS_LABELS = {
  CREATED: 'checkout.shipmentStatus.created',
  PICKED_UP: 'checkout.shipmentStatus.pickedUp',
  IN_TRANSIT: 'checkout.shipmentStatus.inTransit',
  OUT_FOR_DELIVERY: 'checkout.shipmentStatus.outForDelivery',
  DELIVERED: 'checkout.shipmentStatus.delivered',
  DELIVERY_FAILED: 'checkout.shipmentStatus.deliveryFailed',
  RTO_INITIATED: 'checkout.shipmentStatus.rtoInitiated',
  RTO_DELIVERED: 'checkout.shipmentStatus.rtoDelivered',
  CANCELLED: 'checkout.shipmentStatus.cancelled',
};

const STATUS_DEFAULTS = {
  CREATED: 'Shipment created',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  DELIVERY_FAILED: 'Delivery failed',
  RTO_INITIATED: 'Returning to sender',
  RTO_DELIVERED: 'Returned',
  CANCELLED: 'Cancelled',
};

export default function ShipmentStatusCard({ orderId, orderStatus }) {
  const { t } = useTranslation();
  // 'loading' | 'ready' | 'notFound' | 'error'
  const [state, setState] = useState('loading');
  const [shipment, setShipment] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchStatus = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setState('loading');
      try {
        const result = await shippingService.trackShipment(orderId);
        setShipment(result);
        setState('ready');
      } catch (error) {
        if (error?.response?.status === 404) {
          setState('notFound');
        } else {
          setState('error');
        }
      }
    },
    [orderId]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchStatus({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('checkout.confirmCancelShipment', 'Cancel this shipment?'))) return;
    setIsCancelling(true);
    try {
      const updated = await shippingService.cancelShipment(orderId);
      setShipment(updated);
    } catch (error) {
      handleError(error, "Couldn't cancel the shipment. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="card p-5 text-left mx-auto max-w-md mt-4">
        <div className="animate-pulse flex flex-col gap-4" aria-hidden="true">
          <div className="flex items-center justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
        </div>
        <p className="sr-only" role="status">{t('checkout.loadingShipment', 'Checking shipment status…')}</p>
      </div>
    );
  }

  if (state === 'notFound') {
    // No Shipment row yet (admin hasn't dispatched it) — still render the
    // timeline from orderStatus alone so tracking doesn't look "broken"
    // between checkout and dispatch, just visibly not there yet.
    return (
      <div className="card p-5 text-left mx-auto max-w-md mt-4 flex flex-col gap-4">
        <OrderTrackingTimeline orderStatus={orderStatus} shipmentStatus={null} />
        <div className="flex items-center gap-2 text-sm text-gray-500 border-t border-gray-100 pt-3">
          <FiCalendar className="w-4 h-4 shrink-0" aria-hidden />
          {t('checkout.shipmentPending', "We'll share tracking details once your order ships.")}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="card p-5 text-left mx-auto max-w-md mt-4 flex items-center justify-between gap-3 text-sm text-gray-500">
        <span>{t('checkout.shipmentCheckFailed', "Couldn't load shipment status.")}</span>
        <button type="button" onClick={handleRefresh} className="btn btn-outline px-3 py-1.5 text-xs">
          {t('checkout.retry', 'Retry')}
        </button>
      </div>
    );
  }

  const statusKey = STATUS_LABELS[shipment.status] ?? STATUS_LABELS.CREATED;
  const statusLabel = t(statusKey, STATUS_DEFAULTS[shipment.status] ?? shipment.status);
  const canCancel = CANCELLABLE_STATUSES.has(shipment.status);

  return (
    <div className="card p-5 text-left mx-auto max-w-md mt-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-gray-900">{statusLabel}</span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label={t('checkout.refreshShipment', 'Refresh shipment status')}
          className="p-1.5 rounded-md text-gray-500 hover:text-[var(--clr-primary)] hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </div>

      <OrderTrackingTimeline orderStatus={orderStatus} shipmentStatus={shipment.status} />

      <div className="text-sm text-gray-600 flex flex-col gap-1 mt-4 pt-3 border-t border-gray-100">
        {/* estimatedDeliveryDate is set on the shipment when it's created,
            and kept fresh by the backend if Delhivery later revises it (see
            shipping.service.js) — shown here only while it's still
            meaningful (not already delivered/returned/cancelled). */}
        {!TERMINAL_STATUSES.has(shipment.status) && formatDeliveryDate(shipment.estimatedDeliveryDate) && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <FiCalendar className="w-3.5 h-3.5 shrink-0 text-gray-500" aria-hidden />
              {t('checkout.estimatedDelivery', 'Estimated delivery')}
            </span>
            <span className="font-medium text-gray-900">
              {formatDeliveryDate(shipment.estimatedDeliveryDate)}
            </span>
          </div>
        )}
        {shipment.trackingId && (
          <div className="flex justify-between">
            <span>{t('checkout.trackingId', 'Tracking ID')}</span>
            <span className="font-mono text-gray-900">{shipment.trackingId}</span>
          </div>
        )}
        {shipment.lastLocation && (
          <div className="flex justify-between">
            <span>{t('checkout.lastLocation', 'Last update')}</span>
            <span className="text-gray-900">{shipment.lastLocation}</span>
          </div>
        )}
        {shipment.lastSyncedAt && (
          <div className="flex justify-between">
            <span>{t('checkout.lastSynced', 'As of')}</span>
            <span className="text-gray-900">
              {new Date(shipment.lastSyncedAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {canCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCancelling}
          className="btn btn-outline w-full mt-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isCancelling
            ? t('checkout.cancellingShipment', 'Cancelling…')
            : t('checkout.cancelShipment', 'Cancel shipment')}
        </button>
      )}
    </div>
  );
}

ShipmentStatusCard.propTypes = {
  orderId: PropTypes.string.isRequired,
  // Order.status (see prisma/schema.prisma) — used to render the
  // Placed/Confirmed portion of the tracking timeline even before a
  // Shipment record exists, and as the fallback source of truth once
  // a shipment reaches a terminal state. Optional for backward
  // compatibility with any other caller of this card; the timeline
  // degrades gracefully (starts at "Placed") when omitted.
  orderStatus: PropTypes.string,
};
