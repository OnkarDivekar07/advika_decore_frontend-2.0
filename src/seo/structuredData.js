// src/seo/structuredData.js
//
// JSON-LD builders. Every function here only ever echoes back real data
// that was passed in (product name/price/stock actually fetched from the
// API, category/breadcrumb labels actually shown on the page) — none of
// them invent ratings, reviews, prices, or availability. Where a
// commonly-expected schema.org field has no real backing value in this
// codebase (business address, logo, social profiles), it's omitted
// rather than filled with a placeholder.
import { SITE_NAME, SITE_DESCRIPTION, SITE_LOGO_URL, getSiteUrl } from './siteConfig';
import { buildAbsoluteUrl, schemaAvailability } from './seoUtils';

/**
 * Organization schema — who's operating this storefront. Rendered once,
 * site-wide (see components/Shared/GlobalSeo.jsx), not per-page.
 */
export function buildOrganizationJsonLd() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: getSiteUrl(),
  };
  // Only attached when a real, hosted logo URL is configured — see the
  // comment on SITE_LOGO_URL in siteConfig.js for why this isn't
  // defaulted to a placeholder image.
  if (SITE_LOGO_URL) org.logo = buildAbsoluteUrl(SITE_LOGO_URL);
  return org;
}

/** WebSite schema — enables sitelinks search box eligibility in results. */
export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: getSiteUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * BreadcrumbList schema, built from the exact same items the visible
 * <Breadcrumb> component renders — so the structured data can never say
 * something different from what's on the page.
 *
 * @param {{ label: string, href: string|null }[]} items
 * @returns {object}
 */
export function buildBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: buildAbsoluteUrl(item.href) } : {}),
    })),
  };
}

/**
 * Product schema for a product detail page. `price` and `availability`
 * are read straight from the product object this page actually fetched
 * (see ProductDetailPage/ProductDetails) — never a fixed/fake value.
 * Deliberately has NO `aggregateRating`/`review` fields: this app has no
 * real review or rating data anywhere, and fabricating one would violate
 * schema.org's own review-snippet guidelines as well as this task's
 * explicit constraint.
 *
 * @param {object} args
 * @param {string} args.name
 * @param {string} args.description - plain text, not HTML
 * @param {string[]} args.images - absolute or root-relative image URLs
 * @param {string} args.sku - product id
 * @param {number|null} args.price
 * @param {{ available: boolean }} args.stock
 * @param {string} args.url - canonical absolute product URL
 * @param {string} [args.category]
 * @returns {object}
 */
export function buildProductJsonLd({ name, description, images, sku, price, stock, url, category }) {
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    ...(description ? { description } : {}),
    ...(images?.length ? { image: images } : {}),
    sku,
    ...(category ? { category } : {}),
  };

  // Only emit an `offers` block when there's a real numeric price to
  // report — an ecommerce Product schema with no offers is valid;
  // one with a fabricated ₹0 price is not.
  if (typeof price === 'number' && Number.isFinite(price)) {
    product.offers = {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: price.toFixed(2),
      availability: schemaAvailability(stock),
      url,
    };
  }

  return product;
}
