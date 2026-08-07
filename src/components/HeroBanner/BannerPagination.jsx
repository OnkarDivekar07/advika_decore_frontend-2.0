// src/components/HeroBanner/BannerPagination.jsx
import React from 'react';

export default function BannerPagination({ total, current, onChange }) {
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20"
      role="tablist"
      aria-label="Banner navigation"
    >
      {Array.from({ length: total }).map((_, idx) => (
        <button
          key={idx}
          role="tab"
          aria-selected={idx === current}
          aria-label={`Go to slide ${idx + 1}`}
          onClick={() => onChange(idx)}
          className={`rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white ${
            idx === current
              ? 'w-6 h-2.5 bg-[var(--clr-primary)]'
              : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
          }`}
        />
      ))}
    </div>
  );
}
