// src/pages/Home/HomePage.jsx
import React from 'react';
import Navbar from '@/components/Navbar/Navbar';
import HeroBanner from '@/components/HeroBanner/HeroBanner';
import NewArrivals from '@/components/Product/NewArrivals';
import Categories from '@/components/Product/Categories';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <HeroBanner />
        <NewArrivals />
        <Categories />
      </main>
    </>
  );
}
