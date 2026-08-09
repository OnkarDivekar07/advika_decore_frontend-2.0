// src/components/Product/ImageGallery.jsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';

export default function ImageGallery({ images = [] }) {
  const { t } = useTranslation();
  const validImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset selection when the product (and therefore its image list)
  // changes — e.g. navigating from one product page to another.
  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  // No images at all is still a valid product state — show a single
  // placeholder frame instead of collapsing the whole gallery column,
  // which would otherwise leave the layout lopsided.
  const activeSrc = validImages[activeIndex] ?? null;

  return (
    <section className="md:w-1/2 flex flex-col gap-4" aria-label={t('productDetail.imageGallery', 'Product images')}>
      {/* Main image */}
      <div className="bg-gray-50 rounded-card border border-[var(--clr-border)] flex justify-center items-center overflow-hidden aspect-square">
        <ImageWithFallback
          src={activeSrc}
          alt={t('productDetail.selectedImageAlt', 'Selected product view')}
          className="w-full h-full object-contain p-4 transition-opacity duration-300"
          loading="eager"
        />
      </div>

      {/* Thumbnails */}
      {validImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scroll-strip" role="list">
          {validImages.map((thumb, index) => (
            <button
              key={index}
              type="button"
              role="listitem"
              onClick={() => setActiveIndex(index)}
              aria-label={t('productDetail.viewImageN', 'View image {{n}}', { n: index + 1 })}
              aria-pressed={index === activeIndex}
              className={`w-16 h-16 shrink-0 rounded-lg border-2 overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary ${
                index === activeIndex
                  ? 'border-primary shadow-sm scale-105'
                  : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <ImageWithFallback
                src={thumb}
                alt={t('productDetail.thumbnailAlt', 'Thumbnail {{n}}', { n: index + 1 })}
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
