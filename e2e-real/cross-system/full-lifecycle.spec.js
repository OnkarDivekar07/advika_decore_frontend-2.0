// e2e-real/cross-system/full-lifecycle.spec.js — REAL FULL-STACK E2E,
// cross-system.
//
// Drives BOTH real apps in one test: the real admin panel (real CRA dev
// server, port 3002 — see admin_panel_fixed/playwright.config.js's
// "admin-real" project, started separately) and the real storefront (this
// project's own "frontend-real" project, port 5174) — both against the
// SAME real backend (port 5001) and SAME real database. Nothing here uses
// page.route()/route.fulfill() anywhere.
//
//   ADMIN creates product -> BACKEND persists -> DATABASE has it
//     -> FRONTEND customer discovers it -> CUSTOMER purchases it
//     -> BACKEND creates a real order -> DATABASE order exists
//     -> INVENTORY stock genuinely decreases
//     -> ADMIN sees the real order -> ADMIN ships it (status change)
//     -> BACKEND persists the new status
//     -> CUSTOMER sees the updated real status on the real storefront
//
// This is the single test that proves the three real apps + real database
// genuinely work together, not just individually.
//
// ENVIRONMENT NOTE (see final report): this test's very first real step —
// admin product creation — requires a real image upload, which the real
// backend genuinely rejects without one (400 "No images uploaded",
// confirmed against the real server) and this environment's real AWS
// credentials (backend 2.0/.env) are rejected by AWS itself
// (InvalidAccessKeyId). That makes this specific test fail here, purely on
// that environment limitation — not an app bug, and not fixable by
// adjusting the test (unlike admin-journey.spec.js's inventory test, this
// one's whole point is proving a FRESH admin-created product reaches a
// customer, so substituting a seeded product would defeat the test).
// Every individual real step this test chains together (admin login, real
// order placement, real shipment creation, cross-app status sync) is
// independently verified elsewhere (customer-journey.spec.js,
// admin-journey.spec.js) — with working AWS credentials, this test is
// expected to pass end to end unchanged.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import realApi from '../support/realApi.js';
import { E2E_CUSTOMER_PHONE, E2E_OTP, E2E_ADDRESS, uniqueProductName } from '../fixtures/e2eData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_REAL_BASE_URL = process.env.E2E_REAL_ADMIN_URL || 'http://localhost:3002';
const FRONTEND_REAL_BASE_URL = process.env.E2E_REAL_BASE_URL || 'http://localhost:5174';
const ADMIN_EMAIL = 'e2e-admin@advika-e2e.test';
const ADMIN_PASSWORD = 'E2eAdmin@12345';
const LOGO_BYTES = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'admin_panel_fixed', 'public', 'admin-logo.png')
);

test('full cross-system lifecycle: admin creates a product a real customer buys, ships, and sees update', async ({ browser }) => {
  const productName = uniqueProductName('CrossSystem');
  const imageName = `e2e-fixture-${Date.now()}.png`;

  // Each context gets its own explicit baseURL — neither is the
  // "frontend-real" project's own fixture-provided context (this test
  // needs two independent browser identities against two different
  // origins at once), so Playwright's config-level baseURL isn't
  // inherited automatically here.
  // === ADMIN: create the product (real admin app, real backend, real S3) ===
  const adminContext = await browser.newContext({ baseURL: ADMIN_REAL_BASE_URL });
  const adminPage = await adminContext.newPage();
  await adminPage.goto(ADMIN_REAL_BASE_URL);
  await adminPage.locator('#email').fill(ADMIN_EMAIL);
  await adminPage.locator('#password').fill(ADMIN_PASSWORD);
  await adminPage.locator('button[type="submit"]').click();
  await expect(adminPage).toHaveURL(/\/dashboard/, { timeout: 10000 });
  const adminToken = await adminPage.evaluate(() => window.localStorage.getItem('token'));

  await adminPage.goto(`${ADMIN_REAL_BASE_URL}/products`);
  await adminPage.getByTestId('products-add-new-btn').click();
  await adminPage.getByTestId('product-name-input').fill(productName);
  await adminPage.getByTestId('product-category-checkbox-Useful Items').check();
  await adminPage.getByTestId('product-brand-input').fill('Advika E2E');
  await adminPage.getByTestId('product-price-input').fill('850');
  await adminPage.getByTestId('product-stock-input').fill('5');
  await adminPage.getByTestId('product-description-input').fill('Cross-system E2E product.');
  await adminPage.getByTestId('product-images-input').setInputFiles({
    name: imageName,
    mimeType: 'image/png',
    buffer: LOGO_BYTES,
  });
  const createRes = adminPage.waitForResponse(
    (res) => res.url().endsWith('/api/products') && res.request().method() === 'POST'
  );
  await adminPage.getByTestId('product-form-submit-btn').click();
  const jobId = (await (await createRes).json()).data.jobId;

  // === BACKEND + DATABASE: poll the real job until the product is genuinely persisted ===
  let productId;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const jobRes = await realApi.get(`/api/products/jobs/${jobId}`, adminToken);
    if (jobRes.body.data.state === 'completed') {
      productId = jobRes.body.data.result.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  expect(productId).toBeTruthy();
  await expect(adminPage.getByText('Product created.')).toBeVisible({ timeout: 10000 });

  const productCheck = await realApi.getProduct(productId);
  expect(productCheck.body.data.stock).toBe(5);

  // === FRONTEND: a real customer discovers the product the admin just created ===
  const customerContext = await browser.newContext({ baseURL: FRONTEND_REAL_BASE_URL });
  const customerPage = await customerContext.newPage();
  // /search (not /products) is the page that actually fires
  // /api/products?search= — see customer-journey.spec.js's identical note.
  await customerPage.goto('/search');
  await customerPage.getByTestId('search-results-input').fill(productName);
  await customerPage.waitForResponse((res) => res.url().includes('/api/products?') && res.url().includes('search='));
  await expect(customerPage.getByTestId(`product-card-${productId}`)).toBeVisible({ timeout: 10000 });

  // Real login for the customer.
  await customerPage.goto('/login');
  await customerPage.getByTestId('login-phone-input').fill(E2E_CUSTOMER_PHONE);
  await customerPage.getByTestId('login-send-otp-button').click();
  await expect(customerPage.getByTestId('login-otp-hidden-input')).toBeVisible({ timeout: 10000 });
  await customerPage.getByTestId('login-otp-hidden-input').fill(E2E_OTP);
  await customerPage.getByTestId('login-verify-button').click();
  await expect(customerPage.getByTestId('login-fullname-input')).toBeVisible({ timeout: 10000 });
  await customerPage.getByTestId('login-skip-button').click();
  await expect(customerPage.getByTestId('login-start-shopping-button')).toBeVisible({ timeout: 10000 });
  const customerToken = await customerPage.evaluate(() => window.sessionStorage.getItem('authToken'));

  // Ensure a delivery address exists (idempotent — real backend allows
  // multiple; this cross-system spec doesn't depend on any other spec's
  // run order).
  await realApi.createAddress(
    { ...E2E_ADDRESS, phone: '9876500095', houseArea: `${Date.now()} Cross-System Lane` },
    customerToken
  );

  await customerPage.goto(`/product/${productId}`);
  await customerPage.getByTestId('product-detail-add-to-cart-button').click();
  await customerPage.goto('/checkout');
  await expect(customerPage.getByTestId('address-selection-continue-button')).toBeEnabled({ timeout: 15000 });
  await customerPage.getByTestId('address-selection-continue-button').click();
  await customerPage.waitForURL(/\/checkout\/review$/, { timeout: 15000 });
  await expect(customerPage.getByTestId('review-proceed-to-payment-button')).toBeEnabled({ timeout: 15000 });
  await customerPage.getByTestId('review-proceed-to-payment-button').click();
  await customerPage.waitForURL(/\/checkout\/payment$/, { timeout: 15000 });
  await customerPage.getByTestId('payment-method-cod').check({ force: true });

  const placeRes = customerPage.waitForResponse(
    (res) => res.url().includes('/api/payment/cod') && res.request().method() === 'POST'
  );
  await customerPage.getByTestId('payment-place-order-button').click();
  const placed = await placeRes;
  expect(placed.status()).toBe(200);
  await customerPage.waitForURL(/\/order\/success\//, { timeout: 15000 });
  const orderId = customerPage.url().split('/order/success/')[1]?.split(/[/?]/)[0];
  expect(orderId).toBeTruthy();

  // === DATABASE + INVENTORY: order exists, real stock genuinely decreased ===
  const orderCheck = await realApi.getOrder(orderId, customerToken);
  expect(orderCheck.status).toBe(200);
  expect(orderCheck.body.data.paymentStatus).toBe('cod_pending');

  const inventoryAfter = await realApi.getInventory(productId, adminToken);
  expect(inventoryAfter.body.data.stock).toBe(4); // 5 - 1 purchased

  // === ADMIN: the real order appears, admin ships it (real status change) ===
  await adminPage.goto(`${ADMIN_REAL_BASE_URL}/orders/${orderId}`);
  await expect(adminPage.getByText('Order Summary')).toBeVisible({ timeout: 15000 });
  await expect(adminPage.getByTestId('order-create-shipment-btn')).toBeVisible({ timeout: 10000 });

  const shipRes = adminPage.waitForResponse((res) => res.url().includes(`/api/shipping/${orderId}/create`));
  await adminPage.getByTestId('order-create-shipment-btn').click();
  expect((await shipRes).status()).toBe(200);
  await expect(adminPage.getByTestId('order-refresh-tracking-btn')).toBeVisible({ timeout: 10000 });

  // === BACKEND: status change genuinely persisted ===
  const orderAfterShip = await realApi.getOrder(orderId, adminToken);
  expect(orderAfterShip.body.data.status).toBe('shipped');

  // === CUSTOMER: sees the real updated status on the real storefront ===
  await customerPage.goto(`/orders/${orderId}/track`);
  await expect(customerPage.getByText(`#${orderId}`)).toBeVisible({ timeout: 15000 });
  await expect(customerPage.getByText('Shipped', { exact: true }).first()).toBeVisible({ timeout: 10000 });

  await adminContext.close();
  await customerContext.close();
});
