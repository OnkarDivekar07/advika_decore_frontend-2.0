// src/components/Shared/ImageWithFallback.jsx
//
// Drop-in replacement for a plain <img>: shows a subtle loading skeleton
// until the image decodes, and swaps to a local placeholder graphic if
// the source is missing or fails to load — so a dead product-image URL
// never shows the browser's broken-image icon.
import React, { useEffect, useState } from 'react';

export const DEFAULT_PLACEHOLDER = '/images/placeholder.svg';

export default function ImageWithFallback({
  src,
  alt = '',
  className = '',
  placeholderSrc = DEFAULT_PLACEHOLDER,
  showSkeleton = true,
  onLoad,
  onError,
  ...rest
}) {
  const [currentSrc, setCurrentSrc] = useState(src || placeholderSrc);
  const [isLoading, setIsLoading] = useState(Boolean(src));

  // Re-sync when the caller passes a new src (e.g. switching gallery
  // thumbnails, or navigating from one product to another).
  useEffect(() => {
    setCurrentSrc(src || placeholderSrc);
    setIsLoading(Boolean(src));
  }, [src, placeholderSrc]);

  const handleError = (e) => {
    // Only fall back once — if the placeholder itself 404s, don't loop.
    if (currentSrc !== placeholderSrc) {
      setCurrentSrc(placeholderSrc);
      setIsLoading(false);
    }
    onError?.(e);
  };

  const handleLoad = (e) => {
    setIsLoading(false);
    onLoad?.(e);
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={handleError}
      onLoad={handleLoad}
      className={[className, showSkeleton && isLoading ? 'animate-pulse bg-gray-200' : ''].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
