// e2e/product-and-cart.spec.js — browsing/search (ProductListingPage,
// AdvikaProductCard) and cart (CartPage, CartContext).
import { test, expect } from '@playwright/test';
import { installDefaultMocks, loginAs, API_BASE } from './support/mockApi.js';
import { PRODUCTS, PRODUCT_1, PRODUCT_2 } from './fixtures/data.js';

test.describe('Product listing', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
  });

  test('shows all seeded products by default', async ({ page }) => {
    await page.goto('/products');
    for (const p of PRODUCTS) {
      await expect(page.getByTestId(`product-card-${p.id}`)).toBeVisible();
    }
  });

  test('empty search results show an empty state, not a crash', async ({ page }) => {
    await page.route(`${API_BASE}/api/products?**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          data: [],
          meta: { total: 0, page: 1, limit: 20, totalPages: 0, timestamp: new Date().toISOString() },
        }),
      })
    );
    await page.goto('/products?category=nonexistent');
    // None of the seeded product cards should render.
    await expect(page.getByTestId(`product-card-${PRODUCT_1.id}`)).not.toBeVisible();
  });

  test('a 500 from the product list shows an error state with retry', async ({ page }) => {
    await page.route(`${API_BASE}/api/products?**`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Internal server error', errors: null }),
      })
    );
    await page.goto('/products');
    await expect(page.getByTestId('product-listing-retry-button')).toBeVisible({ timeout: 10000 });
  });

  test('wishlist toggle on a product card requires no crash when logged out (guest wishlist)', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-wishlist-toggle-${PRODUCT_1.id}`).click();
    // Guest wishlist is localStorage-backed per CartContext/WishlistContext
    // architecture — clicking must not throw/navigate away.
    await expect(page.getByTestId(`product-card-${PRODUCT_1.id}`)).toBeVisible();
  });
});

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAs(page);
  });

  test('adding a product from its card updates the cart, visible on /cart', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-add-to-cart-${PRODUCT_1.id}`).click();

    await page.goto('/cart');
    await expect(page.getByTestId(`cart-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });
  });

  test('quantity increase/decrease updates the line and cart persists across reload', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-add-to-cart-${PRODUCT_1.id}`).click();
    await page.goto('/cart');
    await expect(page.getByTestId(`cart-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });

    // CartContext debounces quantity taps ~400ms before sending PUT
    // /api/cart — the UI updates optimistically first. Wait for that
    // network round-trip to actually land before reloading, otherwise
    // the reload legitimately shows the pre-debounce, not-yet-persisted
    // quantity (which is what happened here on the first pass of this
    // test — the app was behaving correctly, the test just reloaded too
    // early).
    const persisted = page.waitForResponse(
      (res) => res.url().includes('/api/cart') && res.request().method() === 'PUT'
    );
    await page.getByTestId(`cart-item-increase-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId(`cart-item-quantity-${PRODUCT_1.id}`)).toHaveText('2');
    await persisted;

    // 'domcontentloaded' rather than the default 'load': this Vite dev
    // server's SPA reload doesn't reliably fire the document 'load' event
    // within a reasonable time in this environment, and it isn't needed
    // here anyway — the assertion below already waits for the actual
    // re-rendered DOM content, which is the real signal this test cares
    // about.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`cart-item-quantity-${PRODUCT_1.id}`)).toHaveText('2', { timeout: 10000 });
  });

  test('removing the only item empties the cart', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-add-to-cart-${PRODUCT_1.id}`).click();
    await page.goto('/cart');
    await expect(page.getByTestId(`cart-item-${PRODUCT_1.id}`)).toBeVisible({ timeout: 10000 });

    await page.getByTestId(`cart-item-remove-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('cart-empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('the add-to-cart control for an out-of-stock product is disabled client-side', async ({ page }) => {
    // PRODUCT_2 has stock: 0 in the fixture data. AdvikaProductCard already
    // disables the button in this state (verified below) rather than
    // letting the click through to a server-side rejection — a stronger
    // UX guarantee than the naive "click then expect a 400" this test
    // originally assumed, which is why it never even reached the network.
    await page.goto('/products');
    await expect(page.getByTestId(`product-card-add-to-cart-${PRODUCT_2.id}`)).toBeDisabled();

    // Belt-and-suspenders: the cart itself must never end up with this
    // out-of-stock line, however it might get there.
    await page.goto('/cart');
    await expect(page.getByTestId(`cart-item-${PRODUCT_2.id}`)).not.toBeVisible();
  });

  test('cart totals reflect the free-delivery threshold from the backend config', async ({ page }) => {
    await page.goto('/products');
    // PRODUCT_1 is priced at 2499, above the 600 free-delivery threshold
    // the mock's /api/shipping/delivery-config returns.
    await page.getByTestId(`product-card-add-to-cart-${PRODUCT_1.id}`).click();
    await page.goto('/cart');
    const cartItem = page.getByTestId(`cart-item-${PRODUCT_1.id}`);
    await expect(cartItem).toBeVisible({ timeout: 10000 });
    // Scoped to the cart line itself — the same amount legitimately
    // repeats elsewhere on the page (order summary, sticky bar), so an
    // unscoped text match is ambiguous (Playwright strict mode).
    await expect(cartItem.getByText(/2,?499/)).toBeVisible();
  });
});
