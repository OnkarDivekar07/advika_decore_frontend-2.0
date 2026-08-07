// src/components/HeroBanner/BannerSlide.jsx
import React from 'react';

/**
 * BannerSlide – always rendered but hidden via opacity/pointer-events so
 * CSS transitions work correctly (no unmount flicker).
 */
export default function BannerSlide({ banner, isActive }) {
  return (
    <div
      aria-hidden={!isActive}
      className={`absolute inset-0 transition-opacity duration-700 ${
        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
      }`}
    >
      <img
        src={banner.imageUrl || banner.image || '/banners/banner-instant.webp'}
        alt={banner.alt || banner.title || 'Banner'}
        className="w-full h-full object-cover object-center rounded-xl"
        draggable={false}
        loading="lazy"
      />
      {/* Optional overlay text */}
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 bg-gradient-to-t from-black/50 to-transparent rounded-xl">
          {banner.title && (
            <p className="font-display text-white text-2xl sm:text-4xl font-bold drop-shadow">
              {banner.title}
            </p>
          )}
          {banner.subtitle && (
            <p className="text-white/90 mt-1 text-sm sm:text-base drop-shadow">
              {banner.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
