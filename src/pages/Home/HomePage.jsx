// src/pages/Home/HomePage.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar/Navbar';
import HeroBanner from '@/components/HeroBanner/HeroBanner';
import NewArrivals from '@/components/Product/NewArrivals';
import Categories from '@/components/Product/Categories';
import Seo from '@/components/Shared/Seo';
import { SITE_DESCRIPTION } from '@/seo/siteConfig';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Navbar />
      <Seo canonicalPath="/" description={SITE_DESCRIPTION} />
      <main id="main-content" tabIndex={-1}>
        {/* Visually hidden: the hero banner below is the page's visual
            title treatment, but its slide text is admin-editable,
            rotates, and isn't guaranteed to always state what the page
            is about — the document still needs exactly one real, stable
            <h1> for both accessibility and SEO's heading-hierarchy
            expectations (the <h2>s in NewArrivals/Categories below
            otherwise have no <h1> parent on this page). Kept sr-only
            rather than visible to avoid changing the homepage's existing
            visual design. */}
        <h1 className="sr-only">
          {t('homepage.pageTitle', 'Advika Décor — Vehicle Décor & Accessories')}
        </h1>
        <HeroBanner />
        <NewArrivals />
        <Categories />
      </main>
    </>
  );
}
