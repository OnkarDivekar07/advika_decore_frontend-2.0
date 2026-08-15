// src/pages/Home/HomePage.jsx
import React, { Suspense } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import Spinner from '@/components/Shared/Spinner';

const HeroBanner  = React.lazy(() => import('@/components/HeroBanner/HeroBanner'));
const NewArrivals = React.lazy(() => import('@/components/Product/NewArrivals'));
const Categories  = React.lazy(() => import('@/components/Product/Categories'));

function SectionFallback() {
  return (
    <div className="w-full py-16 flex justify-center">
      <Spinner />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<SectionFallback />}>
          <HeroBanner />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <NewArrivals />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <Categories />
        </Suspense>
      </main>
    </>
  );
}
