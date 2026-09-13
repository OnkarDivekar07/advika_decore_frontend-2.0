// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/Shared/Icon';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import Seo from '@/components/Shared/Seo';

export default function NotFound() {
  return (
    <div className="aa-shell min-h-screen bg-advika-warm-white">
      <AdvikaHeader />
      {/* This is a client-side SPA route match, not a real HTTP 404 — the
          server still returns 200 for this path (see SEO.md "known
          limitation" note). noindex is the one thing achievable purely
          from the frontend; a true status-code fix needs the hosting/
          server config to serve a 404 status for unmatched routes. */}
      <Seo title="Page Not Found" noindex />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-[60vh] flex-col items-center justify-center gap-[15px] px-6 py-12 text-center"
      >
        <span className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#e9e7e3]">
          <Icon name="link_off" size={38} className="text-advika-grey600" />
        </span>
        <h1 className="font-archivoBlack text-[20px] leading-[1.2] text-advika-chrome">Page not found</h1>
        <p className="max-w-[290px] text-[13.5px] text-advika-grey800">
          The page you're looking for doesn't exist or was moved.
        </p>
        <Link
          to="/"
          className="aa-label mt-1 flex h-12 items-center justify-center rounded bg-advika-orange px-8 text-[12.5px] font-bold text-white"
        >
          Go Home
        </Link>
      </main>
      <AdvikaFooter />
    </div>
  );
}
