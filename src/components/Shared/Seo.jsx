// src/components/Shared/Seo.jsx
//
// One place every page uses to declare its title/description/canonical/
// social metadata and any JSON-LD it needs. Built on react-helmet-async
// (HelmetProvider is mounted once in App.jsx) so tags update per-route
// without a hard page reload, and so a deeper page's <Seo> correctly
// overrides the defaults GlobalSeo sets at the app root.
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, DEFAULT_OG_IMAGE } from '@/seo/siteConfig';
import { buildAbsoluteUrl } from '@/seo/seoUtils';

/**
 * @param {object} props
 * @param {string} props.title - page-specific title; site name is appended automatically
 * @param {string} [props.description]
 * @param {string} [props.canonicalPath] - root-relative path (e.g. '/product/123/foo'); omit to leave canonical unset
 * @param {string} [props.image] - root-relative or absolute image URL for OG/Twitter
 * @param {'website'|'product'} [props.ogType]
 * @param {boolean} [props.noindex] - true for account/cart/checkout pages that shouldn't appear in search results
 * @param {object|object[]} [props.jsonLd] - one or more JSON-LD objects to embed
 */
export default function Seo({
  title,
  description,
  canonicalPath,
  image,
  ogType = 'website',
  noindex = false,
  jsonLd,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = canonicalPath ? buildAbsoluteUrl(canonicalPath) : undefined;
  const ogImage = buildAbsoluteUrl(image || DEFAULT_OG_IMAGE);
  const jsonLdList = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow'} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={ogImage} />

      {/* Twitter — summary_large_image degrades gracefully without a
          @site handle, so this is included even though TWITTER_HANDLE
          is currently unset (see siteConfig.js). */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {jsonLdList.map((data, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
