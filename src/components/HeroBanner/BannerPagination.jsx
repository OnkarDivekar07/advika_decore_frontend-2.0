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
          // p-2.5 -m-2.5: the visible dot stays exactly its original
          // small size (see the inner span below), but the actual tap
          // target grows to ~24px square either way — WCAG 2.2's 2.5.8
          // minimum — via padding that's cancelled back out with a
          // matching negative margin so it doesn't push neighboring
          // dots apart or change the pagination bar's footprint.
          className="p-2 -m-2 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white rounded-full"
        >
          <span
            aria-hidden
            className={`block rounded-full transition-all duration-300 ${
              idx === current
                ? 'w-6 h-2.5 bg-[var(--clr-primary)]'
                : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
