// src/features/products/hooks/useDebouncedValue.js
import { useEffect, useState } from 'react';

/**
 * Returns a version of `value` that only updates after `delay` ms have
 * passed without `value` changing again — the standard debounce pattern,
 * used here so search doesn't fire an API request on every keystroke.
 *
 * @template T
 * @param {T} value
 * @param {number} [delay=400]
 * @returns {T}
 */
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
