import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-unmount React trees between tests (RTL doesn't do this globally by
// default outside its own jest-config auto-import).
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia — several components/hooks in this
// app (toasts, modals) touch it indirectly via libraries that check for
// it defensively. A minimal stub is enough for tests that never actually
// depend on real media-query behavior.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom doesn't implement scrollTo either; useModalA11y and similar UI
// helpers call it defensively when trapping focus/locking scroll.
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}
