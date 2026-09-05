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

// jsdom never computes real layout, so `offsetParent` — the standard way
// to check "is this element actually visible/rendered" — always reads
// null, for every element, regardless of any inline/CSS display value
// (see https://github.com/jsdom/jsdom/issues/1590, closed as "won't
// implement"). useModalA11y's/useFocusTrap's own focus-trap logic
// (frontend-improved and admin_panel_fixed both) filters candidate
// focusable elements on exactly `el.offsetParent !== null`, so without
// this stub every such element in a test looks invisible and the trap's
// candidate list is always empty — not a real bug, a jsdom gap in the
// test environment itself (confirmed live against a real Chromium browser
// via Pattern 21's axe-core scan, which found no such issue). Falling
// back to parentNode is good enough for tests: never null while actually
// attached to the test's rendered tree, which is the only case that
// matters here.
if (typeof window !== 'undefined') {
  // jsdom does define its own `offsetParent` getter — it just always
  // returns null (see above) — so a "only define it if missing" guard
  // would never actually replace it. Unconditionally overriding is safe:
  // this file only ever runs in the test environment, never in a real
  // browser.
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
    get() {
      return this.parentNode;
    },
    configurable: true,
  });
}
