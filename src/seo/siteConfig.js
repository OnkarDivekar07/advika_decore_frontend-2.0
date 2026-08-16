// src/seo/siteConfig.js
//
// Single source of truth for the site-wide facts SEO metadata is built
// from. Deliberately conservative: every field here is either already
// present elsewhere in this codebase (brand name from HeroBanner's
// DEFAULT_BANNER / frontend-README, category list from
// utils/constants.js) or left null/omitted rather than invented. A
// fabricated logo URL, social handle, or street address in structured
// data is worse than none at all — it's misinformation search engines
// will index. Fill in the null fields with real values when they exist;
// don't put placeholder text in them.

// Brand name as it already appears in this codebase (HeroBanner's
// default slide, frontend-README.md title) — not invented for this task.
export const SITE_NAME = 'Advika Décor';

// Grounded in the actual category list this storefront sells against
// (see utils/constants.js PRODUCT_CATEGORIES) rather than generic
// ecommerce boilerplate copy.
export const SITE_DESCRIPTION =
  'Shop vehicle décor and accessories for trucks, tempos, pickups, cars, two-wheelers, and tractors at Advika Décor.';

/**
 * Absolute site origin used to build canonical/OG URLs. Prefers an
 * explicit VITE_SITE_URL (set this in .env for production builds so
 * canonical tags are stable regardless of which host serves the build)
 * and falls back to the browser's own origin so this still works
 * correctly out of the box in any environment without hardcoding a
 * domain this codebase has no authoritative source for.
 */
export const getSiteUrl = () => {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

// No verified logo asset, social handles, or business address exist
// anywhere in this codebase (public/icons is empty; no Twitter/X or
// social links appear in the UI). Left null on purpose — see the
// Organization builder in structuredData.js, which omits any field
// that's null rather than emitting a fake one. Fill these in with real
// values (an actual hosted logo URL, a real @handle) when available.
export const SITE_LOGO_URL = null;
export const TWITTER_HANDLE = null;

// Default social preview image for pages that don't have a more
// specific one (product pages use the product's own image instead).
// Uses the existing hero banner asset already shipped in /public —
// not a new fabricated asset.
export const DEFAULT_OG_IMAGE = '/banners/banner-instant.webp';
