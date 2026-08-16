// src/components/Shared/GlobalSeo.jsx
//
// Mounted once in App.jsx, above the router. Provides the fallback
// title/description every page inherits before its own <Seo> (if any)
// overrides them, and carries the two schemas that describe the site
// itself rather than any single page: Organization and WebSite. Kept
// separate from per-page <Seo> so pages that render Seo don't have to
// remember to also re-declare site identity every time.
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '@/seo/siteConfig';
import { buildAbsoluteUrl } from '@/seo/seoUtils';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/seo/structuredData';

export default function GlobalSeo() {
  const { i18n } = useTranslation();
  const jsonLd = [buildOrganizationJsonLd(), buildWebsiteJsonLd()];

  return (
    <Helmet>
      {/* Kept in sync with the active i18n language (en/hi/mr — see
          LanguageContext) rather than hardcoded, so the <html lang>
          attribute always matches what's actually rendered. */}
      <html lang={i18n.language || 'en'} />
      <title>{SITE_NAME}</title>
      <meta name="description" content={SITE_DESCRIPTION} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={buildAbsoluteUrl(DEFAULT_OG_IMAGE)} />
      {jsonLd.map((data, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
