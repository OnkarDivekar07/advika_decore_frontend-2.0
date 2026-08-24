// e2e/checkout.spec.js — Checkout stepper (CheckoutLayout, CheckoutContext,
// AddressSelectionPage -> ReviewPage -> PaymentPage) and its route guards.
// Covers the full Cash on Delivery journey end to end; the Razorpay
// 'online' path is intentionally NOT exercised past selecting the radio
// (see the harness's own gotcha #9 — Razorpay's checkout.js is an
// external host this sandbox can't reach, and mocking window.Razorpay
// itself is out of scope here).
import { test, expect } from '@playwright/test';
import { installDefaultMocks, loginAs } from './support/mockApi.js';
import { PRODUCT_1 } from './fixtures/data.js';

test.describe('Checkout guards', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
  });

  test('an unauthenticated visitor to /checkout is redirected to /cart', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/cart$/, { timeout: 10000 });
  });

  test('an empty cart at /checkout shows the empty-cart state instead of the address step', async ({ page }) => {
    await loginAs(page);
    await page.goto('/checkout');
    // 'checkout.emptyCart' has no translation entry (src/i18n/en.json) —
    // the fallback string CheckoutLayout.jsx hard-codes is what actually
    // renders, so it's a stable thing to assert on.
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('address-selection-continue-button')).not.toBeVisible();
  });

  test('visiting /checkout/payment directly, with an address selected but review never confirmed, redirects back to /checkout/review', async ({ page }) => {
    await loginAs(page);
    await page.goto('/products');
    await page.getByTestId(`product-card-add-to-cart-${PRODUCT_1.id}`).click();

    // Landing on /checkout auto-selects the default saved address (see
    // AddressSelectionPage's defaultedRef effect), which is enough to
    // make canProceedToReview true — but reviewConfirmed is only ever set
    // by ReviewPage's own confirmReview(), which this deliberately never
    // calls. The continue button turning enabled is this test's signal
    // that the address auto-selection + draft-order fetch has settled.
    await page.goto('/checkout');
    await expect(page.getByTestId('address-selection-continue-button')).toBeEnabled({ timeout: 15000 });

    await page.goto('/checkout/payment');
    await expect(page).toHaveURL(/\/checkout\/review$/, { timeout: 15000 });
  });
});

test.describe('Checkout — Cash on Delivery journey', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAs(page);
  });

  // ---------------------------------------------------------------------
  // REGRESSION TEST — src/pages/Review/ReviewPage.jsx
  //
  // This suite originally found ReviewPage bouncing itself straight back
  // to /checkout on every single mount, before a user could ever see or
  // interact with the review screen — blocking the entire "place an
  // order" flow. Root cause: two effects raced. A guard effect redirected
  // whenever `canProceedToReview` (`!!selectedAddressId && draftStatus
  // === 'ready' && !!draftOrder`) was false; a separate mount effect
  // unconditionally called `refreshDraftOrder`, which synchronously flips
  // `draftStatus` to 'loading' — which the guard effect then reacted to
  // as if the page had no legitimate reason to be there at all, redirecting
  // away before the refresh it triggered could ever resolve back to
  // 'ready'. Fixed by scoping the guard to actual invalid-access cases
  // (no address ever selected, or the draft genuinely errored) rather
  // than reacting to a transient in-flight refresh of an
  // already-valid selection — see ReviewPage.jsx's guard effect comment.
  // ---------------------------------------------------------------------

  test('full COD checkout: address -> review -> payment -> order confirmation', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-add-to-cart-${PRODUCT_1.id}`).click();

    await page.goto('/checkout');
    await expect(page.getByTestId('address-selection-continue-button')).toBeEnabled({ timeout: 15000 });
    await page.getByTestId('address-selection-continue-button').click();

    await page.waitForURL(/\/checkout\/review$/, { timeout: 15000 });
    // Correct expected behavior: the review screen should stay put and
    // become interactive, not bounce back to /checkout (see bug writeup
    // above) — this is the assertion that actually fails today.
    await expect(page.getByTestId('review-proceed-to-payment-button')).toBeEnabled({ timeout: 15000 });
    await page.getByTestId('review-proceed-to-payment-button').click();

    await page.waitForURL(/\/checkout\/payment$/, { timeout: 15000 });
    // Payment method defaults to 'online' (CheckoutContext's paymentMethod
    // state) — switch to Cash on Delivery before placing the order.
    await page.getByTestId('payment-method-cod').check({ force: true });
    await expect(page.getByTestId('payment-place-order-button')).toBeEnabled();
    await page.getByTestId('payment-place-order-button').click();

    await page.waitForURL(/\/order\/success\//, { timeout: 15000 });
    await expect(page.getByTestId('order-success-track-order-link')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/pay .* in cash when it's delivered/i)).toBeVisible();
  });

  test('the payment step offers an online payment option (not completed — Razorpay is an external host this suite can\'t reach)', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`product-card-add-to-cart-${PRODUCT_1.id}`).click();

    await page.goto('/checkout');
    await expect(page.getByTestId('address-selection-continue-button')).toBeEnabled({ timeout: 15000 });
    await page.getByTestId('address-selection-continue-button').click();

    await page.waitForURL(/\/checkout\/review$/, { timeout: 15000 });
    await expect(page.getByTestId('review-proceed-to-payment-button')).toBeEnabled({ timeout: 15000 });
    await page.getByTestId('review-proceed-to-payment-button').click();

    await page.waitForURL(/\/checkout\/payment$/, { timeout: 15000 });
    await expect(page.getByTestId('payment-method-online')).toBeVisible();
    await expect(page.getByTestId('payment-method-online')).toBeChecked();
  });
});
