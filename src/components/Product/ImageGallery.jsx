// src/components/Product/ImageGallery.jsx
import React, { useState, useEffect } from 'react';

export default function ImageGallery({ images = [] }) {
  const [mainImage, setMainImage] = useState(images[0] ?? '');

  // Sync when images prop changes (e.g. product navigation)
  useEffect(() => {
    setMainImage(images[0] ?? '');
  }, [images]);

  if (!images.length) return null;

  return (
    <section className="md:w-1/2 flex flex-col gap-4" aria-label="Product images">
      {/* Main image */}
      <div className="bg-gray-50 rounded-card border border-[var(--clr-border)] flex justify-center items-center overflow-hidden aspect-square">
        <img
          src={mainImage}
          alt="Selected product view"
          className="w-full h-full object-contain p-4 transition-opacity duration-300"
          loading="eager"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scroll-strip" role="list">
          {images.map((thumb, index) => (
            <button
              key={index}
              role="listitem"
              onClick={() => setMainImage(thumb)}
              aria-label={`View image ${index + 1}`}
              aria-pressed={thumb === mainImage}
              className={`w-16 h-16 shrink-0 rounded-lg border-2 overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary ${
                thumb === mainImage
                  ? 'border-primary shadow-sm scale-105'
                  : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <img
                src={thumb}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
