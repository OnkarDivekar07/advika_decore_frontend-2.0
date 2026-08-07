// src/components/HeroBanner/HeroBanner.jsx
import React from 'react';
import { useHeroBanners } from '@/hooks/useHeroBanners';
import BannerSlide from './BannerSlide';
import BannerPagination from './BannerPagination';

const DEFAULT_BANNER = {
  image: '/banners/banner-instant.webp',
  title: 'Welcome to Advika Décor',
  subtitle: 'Discover your style',
};

export default function HeroBanner() {
  const { banners, current, setCurrent, pauseHandlers } = useHeroBanners();
  const slides = banners.length > 0 ? banners : [DEFAULT_BANNER];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6" aria-label="Hero banner">
      <div
        className="relative overflow-hidden rounded-xl aspect-[3/2] sm:aspect-[16/6] bg-gray-200"
        {...pauseHandlers}
      >
        {slides.map((banner, idx) => (
          <BannerSlide key={idx} banner={banner} isActive={idx === current} />
        ))}
        {slides.length > 1 && (
          <BannerPagination
            total={slides.length}
            current={current}
            onChange={setCurrent}
          />
        )}
      </div>
    </section>
  );
}
