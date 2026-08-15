// src/components/HeroBanner/HeroBanner.jsx
import React from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import { useHeroBanners } from '@/hooks/useHeroBanners';
import BannerSlide from './BannerSlide';
import BannerPagination from './BannerPagination';

const DEFAULT_BANNER = {
  image: '/banners/banner-instant.webp',
  title: 'Welcome to Advika Décor',
  subtitle: 'Discover your style',
};

export default function HeroBanner() {
  const { banners, current, setCurrent, isPlaying, togglePlay, pauseHandlers } = useHeroBanners();
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
          <>
            {/* WCAG 2.2.2 (Pause, Stop, Hide): the banner auto-advances
                on its own every few seconds, so there has to be an
                explicit, always-available way to stop that — hovering
                or focusing it (see pauseHandlers) only pauses it
                *while* the pointer/focus is there. Small and unobtrusive
                to match the pagination dots' existing visual language. */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause banner rotation' : 'Resume banner rotation'}
              aria-pressed={!isPlaying}
              className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors focus-visible:outline-2 focus-visible:outline-white"
            >
              {isPlaying ? <FiPause className="w-3.5 h-3.5" aria-hidden /> : <FiPlay className="w-3.5 h-3.5" aria-hidden />}
            </button>
            <BannerPagination
              total={slides.length}
              current={current}
              onChange={setCurrent}
            />
          </>
        )}
      </div>
    </section>
  );
}
