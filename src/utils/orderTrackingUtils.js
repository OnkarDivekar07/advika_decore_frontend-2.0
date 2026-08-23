// src/utils/orderTrackingUtils.js
//
// Shared by OrderSuccessPage (fresh-checkout success/failed/processing
// states) and OrderTrackingPage (the durable Track Order screen) so the
// stage model has exactly one definition — see
// design_handoff_advika_auto/README.md screen 10 "Order tracking".

export const STAGES = ['placed', 'packed', 'shipped', 'outForDelivery', 'delivered'];
export const STAGE_ICONS = {
  placed: 'receipt_long',
  packed: 'inventory_2',
  shipped: 'local_shipping',
  outForDelivery: 'delivery_dining',
  delivered: 'check_circle',
};

// Collapses Order.status + Shipment.status (two backend enums — see
// prisma/schema.prisma) into the wireframe's 5 customer-facing stages.
// Mirrors OrderTrackingTimeline's own resolveCurrentStep rules, just
// bucketed into 5 steps instead of 7.
export function resolveStageIndex(orderStatus, shipmentStatus) {
  if (shipmentStatus === 'DELIVERED' || orderStatus === 'delivered') return 4;
  if (shipmentStatus === 'OUT_FOR_DELIVERY') return 3;
  if (shipmentStatus === 'PICKED_UP' || shipmentStatus === 'IN_TRANSIT' || orderStatus === 'shipped') return 2;
  if (shipmentStatus === 'CREATED' || orderStatus === 'confirmed') return 1;
  return 0;
}

export function formatOrderDate(value, opts) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatOrderDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Shipment.paymentMode ('COD'|'PREPAID', copied from the order at
// shipment-creation time) is the authoritative signal once a shipment
// exists. Before that (order just placed, no shipment yet), fall back to
// the order's own payment_order_id prefix convention — see
// features/orders/utils/paymentStatus.js for the same convention used
// elsewhere.
export function resolvePaymentMethod(order, shipment) {
  if (shipment?.paymentMode) return shipment.paymentMode === 'COD' ? 'cod' : 'online';
  return order?.payment_order_id?.startsWith('cod-') ? 'cod' : 'online';
}
