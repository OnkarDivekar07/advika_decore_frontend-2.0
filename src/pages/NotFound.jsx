// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar/Navbar';
import Seo from '@/components/Shared/Seo';

export default function NotFound() {
  return (
    <>
      <Navbar />
      {/* This is a client-side SPA route match, not a real HTTP 404 — the
          server still returns 200 for this path (see SEO.md "known
          limitation" note). noindex is the one thing achievable purely
          from the frontend; a true status-code fix needs the hosting/
          server config to serve a 404 status for unmatched routes. */}
      <Seo title="Page Not Found" noindex />
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <p className="font-display text-8xl font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold text-gray-800">Page not found</h1>
        <p className="text-gray-500">The page you're looking for doesn't exist or was moved.</p>
        <Link to="/" className="btn btn-primary px-8">Go Home</Link>
      </main>
    </>
  );
}
