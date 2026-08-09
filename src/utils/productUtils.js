// src/utils/productUtils.js
import { getLocalized } from './i18nUtils';

// Below this many units left, we show a "low stock" nudge instead of a
// plain "in stock" badge.
const LOW_STOCK_THRESHOLD = 5;

/**
 * Normalizes stock information out of a product, tolerant of the couple
 * of shapes the backend might send it in (a numeric count under one of
 * a few field names, or a plain boolean flag). If the API sends nothing
 * at all, we assume the item is purchasable rather than blocking the
 * buy buttons on missing data.
 *
 * @param {object} product
 * @returns {{ available: boolean, quantity: number|null, isLow: boolean }}
 */
export function getStockInfo(product) {
  if (!product) return { available: true, quantity: null, isLow: false };

  const numericCandidates = [
    product.stock,
    product.stockQuantity,
    product.quantity,
    product.availableStock,
  ];
  const quantity = numericCandidates.find((v) => typeof v === 'number' && Number.isFinite(v));

  if (typeof quantity === 'number') {
    return {
      available: quantity > 0,
      quantity,
      isLow: quantity > 0 && quantity <= LOW_STOCK_THRESHOLD,
    };
  }

  if (typeof product.inStock === 'boolean') {
    return { available: product.inStock, quantity: null, isLow: false };
  }

  return { available: true, quantity: null, isLow: false };
}

/**
 * Localized unit label for a product (e.g. "piece", "box", "kg"),
 * tolerant of either a plain string or a { en, hi, mr } object.
 *
 * @param {object} product
 * @param {string} lang
 * @returns {string}
 */
export function getProductUnit(product, lang = 'en') {
  const unit = product?.unit ?? product?.unitLabel ?? product?.uom;
  if (!unit) return '';
  return getLocalized(unit, lang);
}

/**
 * Sanitizes free-typed price filter input down to something safe to send
 * as a numeric query param: digits and at most one decimal point, no
 * leading minus (prices can't be negative), no stray characters. Doesn't
 * try to be a full number parser — just strips what a `type="number"`
 * input can still let through via paste (e.g. "12-34", "1e5", "-50").
 *
 * @param {string} raw
 * @returns {string}
 */
export function sanitizePriceInput(raw) {
  const str = String(raw ?? '');
  // Keep digits and dots only (drops -, e, +, spaces, etc.).
  let cleaned = str.replace(/[^0-9.]/g, '');
  // Collapse to at most one decimal point — keep the first, drop the rest.
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

/**
 * Validates a min/max price filter pair. Either side may be empty
 * (meaning "no bound"); both being non-numeric, negative, or min
 * exceeding max is invalid and shouldn't be sent to the API — that
 * combination can only ever produce zero results, or in the worst case
 * be silently misinterpreted by the backend.
 *
 * @param {string} minPrice
 * @param {string} maxPrice
 * @returns {{ valid: boolean, reason: 'min_gt_max'|null }}
 */
export function validatePriceRange(minPrice, maxPrice) {
  const min = minPrice === '' ? null : Number(minPrice);
  const max = maxPrice === '' ? null : Number(maxPrice);

  if (min !== null && max !== null && Number.isFinite(min) && Number.isFinite(max) && min > max) {
    return { valid: false, reason: 'min_gt_max' };
  }
  return { valid: true, reason: null };
}

/**
 * Formats a numeric price for display with Indian-style digit grouping,
 * without the ₹ symbol (callers prefix that themselves so it can sit
 * outside the number for RTL-safe layout). Returns null for anything
 * that isn't a finite number, so callers can show a fallback instead of
 * "₹NaN".
 *
 * @param {number|string} value
 * @returns {string|null}
 */
export function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
