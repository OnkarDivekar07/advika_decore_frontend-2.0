// src/seo/seoUtils.js
import { getSiteUrl } from './siteConfig';

/**
 * Turns a product name into a URL-safe, human-readable slug for the
 * cosmetic segment of a product URL (`/product/:id/:slug`). Purely
 * decorative — ProductDetailPage still fetches by `:id` alone, so a
 * stale/missing/wrong slug never breaks the page, it just isn't the
 * canonical form (see buildProductUrl below, which is what every
 * internal link uses so they're always generated correctly).
 *
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Builds the canonical, clean product URL path: `/product/:id/:slug`.
 * The id is what ProductDetailPage actually uses to fetch (see
 * services/productsService.getProductById) — the slug is an additive,
 * SEO/readability-only segment on top of the existing id-based backend
 * contract, not a replacement for it. Falls back to the id-only form
 * when there's no name to slugify from yet (e.g. a stripped-down
 * product row in a list), which still resolves correctly since the
 * route's slug segment is optional.
 *
 * @param {{ id: string, name?: string|object }} product
 * @param {string} [lang]
 * @returns {string}
 */
export function buildProductPath(product, name) {
  const id = product?.id;
  if (!id) return '/products';
  const slug = slugify(name || '');
  return slug ? `/product/${id}/${slug}` : `/product/${id}`;
}

/** Absolute version of buildProductPath, for canonical/OG tags. */
export function buildProductUrl(product, name) {
  return `${getSiteUrl()}${buildProductPath(product, name)}`;
}

/** Absolute URL for an arbitrary in-app path, for canonical/OG tags. */
export function buildAbsoluteUrl(path) {
  const base = getSiteUrl();
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Strips markup out of an (already-sanitized) HTML product description
 * down to plain text, then truncates it to a sensible meta-description
 * length. Never used for on-page rendering — only for the invisible
 * <meta name="description">/OG description, where raw tags would show
 * up as literal text in search snippets.
 *
 * @param {string} html
 * @param {number} [maxLength=160]
 * @returns {string}
 */
export function htmlToMetaDescription(html, maxLength = 160) {
  if (!html) return '';
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  // Cut at the last whole word inside the limit rather than mid-word.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}

/**
 * Maps this app's normalized stock info (see utils/productUtils#getStockInfo)
 * onto schema.org's availability vocabulary. Always derived from the real
 * product/stock data that was actually fetched — never hardcoded to
 * InStock, which would be exactly the kind of fake availability signal
 * this task explicitly rules out.
 *
 * @param {{ available: boolean }} stockInfo
 * @returns {string} a schema.org/ItemAvailability URL
 */
export function schemaAvailability(stockInfo) {
  return stockInfo?.available
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}
