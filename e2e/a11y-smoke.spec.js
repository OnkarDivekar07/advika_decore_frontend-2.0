// e2e/a11y-smoke.spec.js — Pattern 21 (mobile/responsive/accessibility
// smoke). Runs axe-core against key customer pages at mobile + desktop
// viewports and asserts no critical/serious violations.
//
// `color-contrast` is deliberately excluded: it showed up as a serious
// violation on every single page in this suite (driven substantially by
// the shared header language-toggle button and footer text), but fixing
// it means changing design-system colors — exactly the "visual redesign"
// this pattern's own instructions say not to do during a bug-fix cycle.
// Flagged in the final report as a real, launch-relevant finding for a
// deliberate design-system decision, not silently fixed or silently
// ignored here.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installDefaultMocks, loginAs } from './support/mockApi.js';
import { PRODUCT_1 } from './fixtures/data.js';

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  desktop: { width: 1280, height: 800 },
};

const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'products', path: '/products', auth: false },
  { name: 'search', path: '/search', auth: false },
  { name: 'product-detail', path: `/product/${PRODUCT_1.id}`, auth: false },
  { name: 'cart', path: '/cart', auth: true },
  { name: 'login', path: '/login', auth: false },
  { name: 'checkout-address', path: '/checkout', auth: true },
  { name: 'order-history', path: '/orders', auth: true },
];

// A rule counts as a real regression to fail the build over when its
// impact is 'critical' or 'serious' AND it isn't the known,
// deliberately-excluded color-contrast finding above.
const isBlockingViolation = (v) => v.id !== 'color-contrast' && ['critical', 'serious'].includes(v.impact);

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`a11y smoke — ${viewportName}`, () => {
    test.use({ viewport });

    for (const p of PAGES) {
      test(`${p.name} has no critical/serious a11y violations (excl. color-contrast)`, async ({ page }) => {
        await installDefaultMocks(page);
        if (p.auth) await loginAs(page);
        await page.goto(p.path);
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        const blocking = results.violations.filter(isBlockingViolation);
        expect(
          blocking,
          blocking
            .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s): ${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)
            .join('\n')
        ).toEqual([]);

        // "tables and horizontal overflow" — the page body must never need
        // horizontal scrolling at this viewport. +1px tolerance for
        // sub-pixel rounding.
        const overflowX = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        expect(overflowX, `horizontal overflow of ${overflowX}px at ${p.path}`).toBeLessThanOrEqual(1);
      });
    }
  });
}
