// src/utils/formatDeliveryDate.js
//
// Single formatter for the `estimatedDeliveryDate` the backend now returns
// from GET/POST /api/shipping/serviceability and on a Shipment record (see
// shipping.service.js's addDays/extractEstimatedDeliveryDate) — used by
// AddressForm, ReviewPage, ShipmentStatusCard, and ProductDetails so the
// same date always reads the same way everywhere it's shown, and so a
// display-format tweak only ever needs to happen in one place.
//
// Deliberately dumb: this never computes or guesses a date itself (e.g.
// from `estimatedDays` alone) — it only formats whatever concrete date the
// backend already handed over, since that's the one place the "how many
// days, from what point, in what timezone" rule actually lives.

/**
 * @param {string|Date|null|undefined} value
 * @returns {string|null} e.g. "Fri, 15 Aug" — or null if there's nothing to show
 */
export function formatDeliveryDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
