// e2e/wishlist.spec.js — Wishlist (WishlistPage, WishlistContext,
// AdvikaProductCard's heart toggle). Mirrors CartContext's guest/backend
// architecture per WishlistContext.jsx's own header comment: anonymous
// visitors get a localStorage-backed wishlist with zero backend calls;
// signing in switches to /api/wishlist for the rest of the session.
import { test, expect } from '@playwright/test';
import { installDefaultMocks, loginAs, API_BASE } from './support/mockApi.js';
import { PRODUCT_1, PRODUCT_LOW_STOCK } from './fixtures/data.js';

test.describe('Wishlist — guest (logged out)', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
  });

  test('adding a product from its card persists to the guest (localStorage) wishlist and shows on /wishlist', async ({ page }) => {
    await page.goto('/products');
    const toggle = page.getByTestId(`product-card-wishlist-toggle-${PRODUCT_1.id}`);
    await toggle.click();
    // Optimistic UI updates immediately, no network call in guest mode —
    // aria-pressed flips right away.
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/wishlist');
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });

    // Actually backed by localStorage, not just in-memory React state —
    // survives a reload with no session at all.
    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('wishlist') || '[]'));
    expect(stored.some((item) => item.productId === PRODUCT_1.id)).toBe(true);
  });

  test('an empty guest wishlist shows the empty state with a working "browse products" link', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page.getByTestId('wishlist-empty-state')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('wishlist-browse-products-button').click();
    await expect(page).toHaveURL(/\/products/);
  });
});

test.describe('Wishlist — signed in (backend-synced)', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAs(page);
  });

  test('GET /api/wishlist is called with the session bearer token on load', async ({ page }) => {
    const wishlistGet = page.waitForRequest(
      (req) => req.url().includes(`${API_BASE}/api/wishlist`) && req.method() === 'GET'
    );
    await page.goto('/wishlist');
    const req = await wishlistGet;
    expect(req.headers().authorization).toMatch(/^Bearer .+/);
  });

  test('an empty signed-in wishlist shows the empty state', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page.getByTestId('wishlist-empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('adding a product from its card syncs to the backend and appears on /wishlist', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-wishlist-toggle-${PRODUCT_1.id}`).click();

    await page.goto('/wishlist');
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });
  });

  test('removing an item takes it off the wishlist (and empties it, if it was the only one)', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-wishlist-toggle-${PRODUCT_1.id}`).click();
    await page.goto('/wishlist');
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });

    await page.getByTestId(`wishlist-item-remove-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('wishlist-empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('adding an already-wishlisted product again does not create a duplicate line (idempotent add)', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-wishlist-toggle-${PRODUCT_1.id}`).click();
    await page.goto('/wishlist');
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });

    // WishlistContext's own addItem already guards against a duplicate
    // add at the UI layer (see isWishlisted check in WishlistContext.jsx)
    // — the button can't even re-fire the request once it knows the
    // product is wishlisted. What isn't proven by that guard is whether
    // the *backend* itself is safe against a duplicate POST landing
    // anyway (e.g. a retried request after a dropped response) — so this
    // calls the real POST /api/wishlist endpoint a second time directly,
    // bypassing the UI guard entirely, using the same bearer token the
    // app itself would send.
    const token = await page.evaluate(() => window.sessionStorage.getItem('authToken'));
    await page.evaluate(
      async ({ base, authToken, productId }) => {
        await fetch(`${base}/api/wishlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ productId }),
        });
      },
      { base: API_BASE, authToken: token, productId: PRODUCT_1.id }
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_1.id}`)).toHaveCount(1);
  });

  test('"add all to cart" adds every wishlisted item to the cart', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-wishlist-toggle-${PRODUCT_1.id}`).click();
    await page.getByTestId(`product-card-wishlist-toggle-${PRODUCT_LOW_STOCK.id}`).click();

    await page.goto('/wishlist');
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(`wishlist-item-${PRODUCT_LOW_STOCK.id}`)).toBeVisible();

    await page.getByTestId('wishlist-add-all-to-cart-button').click();

    await page.goto('/cart');
    await expect(page.getByTestId(`cart-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(`cart-item-${PRODUCT_LOW_STOCK.id}`)).toBeVisible();
  });
});
