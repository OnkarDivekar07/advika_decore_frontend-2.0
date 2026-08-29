# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-real\cross-system\full-lifecycle.spec.js >> full cross-system lifecycle: admin creates a product a real customer buys, ships, and sees update
- Location: e2e-real\cross-system\full-lifecycle.spec.js:53:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3002/
Call log:
  - navigating to "http://localhost:3002/", waiting until "load"

```

# Test source

```ts
  1   | // e2e-real/cross-system/full-lifecycle.spec.js — REAL FULL-STACK E2E,
  2   | // cross-system.
  3   | //
  4   | // Drives BOTH real apps in one test: the real admin panel (real CRA dev
  5   | // server, port 3002 — see admin_panel_fixed/playwright.config.js's
  6   | // "admin-real" project, started separately) and the real storefront (this
  7   | // project's own "frontend-real" project, port 5174) — both against the
  8   | // SAME real backend (port 5001) and SAME real database. Nothing here uses
  9   | // page.route()/route.fulfill() anywhere.
  10  | //
  11  | //   ADMIN creates product -> BACKEND persists -> DATABASE has it
  12  | //     -> FRONTEND customer discovers it -> CUSTOMER purchases it
  13  | //     -> BACKEND creates a real order -> DATABASE order exists
  14  | //     -> INVENTORY stock genuinely decreases
  15  | //     -> ADMIN sees the real order -> ADMIN ships it (status change)
  16  | //     -> BACKEND persists the new status
  17  | //     -> CUSTOMER sees the updated real status on the real storefront
  18  | //
  19  | // This is the single test that proves the three real apps + real database
  20  | // genuinely work together, not just individually.
  21  | //
  22  | // ENVIRONMENT NOTE (see final report): this test's very first real step —
  23  | // admin product creation — requires a real image upload, which the real
  24  | // backend genuinely rejects without one (400 "No images uploaded",
  25  | // confirmed against the real server) and this environment's real AWS
  26  | // credentials (backend 2.0/.env) are rejected by AWS itself
  27  | // (InvalidAccessKeyId). That makes this specific test fail here, purely on
  28  | // that environment limitation — not an app bug, and not fixable by
  29  | // adjusting the test (unlike admin-journey.spec.js's inventory test, this
  30  | // one's whole point is proving a FRESH admin-created product reaches a
  31  | // customer, so substituting a seeded product would defeat the test).
  32  | // Every individual real step this test chains together (admin login, real
  33  | // order placement, real shipment creation, cross-app status sync) is
  34  | // independently verified elsewhere (customer-journey.spec.js,
  35  | // admin-journey.spec.js) — with working AWS credentials, this test is
  36  | // expected to pass end to end unchanged.
  37  | import { test, expect } from '@playwright/test';
  38  | import fs from 'fs';
  39  | import path from 'path';
  40  | import { fileURLToPath } from 'url';
  41  | import realApi from '../support/realApi.js';
  42  | import { E2E_CUSTOMER_PHONE, E2E_OTP, E2E_ADDRESS, uniqueProductName } from '../fixtures/e2eData.js';
  43  | 
  44  | const __dirname = path.dirname(fileURLToPath(import.meta.url));
  45  | const ADMIN_REAL_BASE_URL = process.env.E2E_REAL_ADMIN_URL || 'http://localhost:3002';
  46  | const FRONTEND_REAL_BASE_URL = process.env.E2E_REAL_BASE_URL || 'http://localhost:5174';
  47  | const ADMIN_EMAIL = 'e2e-admin@advika-e2e.test';
  48  | const ADMIN_PASSWORD = 'E2eAdmin@12345';
  49  | const LOGO_BYTES = fs.readFileSync(
  50  |   path.join(__dirname, '..', '..', '..', 'admin_panel_fixed', 'public', 'admin-logo.png')
  51  | );
  52  | 
  53  | test('full cross-system lifecycle: admin creates a product a real customer buys, ships, and sees update', async ({ browser }) => {
  54  |   const productName = uniqueProductName('CrossSystem');
  55  |   const imageName = `e2e-fixture-${Date.now()}.png`;
  56  | 
  57  |   // Each context gets its own explicit baseURL — neither is the
  58  |   // "frontend-real" project's own fixture-provided context (this test
  59  |   // needs two independent browser identities against two different
  60  |   // origins at once), so Playwright's config-level baseURL isn't
  61  |   // inherited automatically here.
  62  |   // === ADMIN: create the product (real admin app, real backend, real S3) ===
  63  |   const adminContext = await browser.newContext({ baseURL: ADMIN_REAL_BASE_URL });
  64  |   const adminPage = await adminContext.newPage();
> 65  |   await adminPage.goto(ADMIN_REAL_BASE_URL);
      |                   ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3002/
  66  |   await adminPage.locator('#email').fill(ADMIN_EMAIL);
  67  |   await adminPage.locator('#password').fill(ADMIN_PASSWORD);
  68  |   await adminPage.locator('button[type="submit"]').click();
  69  |   await expect(adminPage).toHaveURL(/\/dashboard/, { timeout: 10000 });
  70  |   const adminToken = await adminPage.evaluate(() => window.localStorage.getItem('token'));
  71  | 
  72  |   await adminPage.goto(`${ADMIN_REAL_BASE_URL}/products`);
  73  |   await adminPage.getByTestId('products-add-new-btn').click();
  74  |   await adminPage.getByTestId('product-name-input').fill(productName);
  75  |   await adminPage.getByTestId('product-category-checkbox-Useful Items').check();
  76  |   await adminPage.getByTestId('product-brand-input').fill('Advika E2E');
  77  |   await adminPage.getByTestId('product-price-input').fill('850');
  78  |   await adminPage.getByTestId('product-stock-input').fill('5');
  79  |   await adminPage.getByTestId('product-description-input').fill('Cross-system E2E product.');
  80  |   await adminPage.getByTestId('product-images-input').setInputFiles({
  81  |     name: imageName,
  82  |     mimeType: 'image/png',
  83  |     buffer: LOGO_BYTES,
  84  |   });
  85  |   const createRes = adminPage.waitForResponse(
  86  |     (res) => res.url().endsWith('/api/products') && res.request().method() === 'POST'
  87  |   );
  88  |   await adminPage.getByTestId('product-form-submit-btn').click();
  89  |   const jobId = (await (await createRes).json()).data.jobId;
  90  | 
  91  |   // === BACKEND + DATABASE: poll the real job until the product is genuinely persisted ===
  92  |   let productId;
  93  |   for (let attempt = 0; attempt < 30; attempt += 1) {
  94  |     const jobRes = await realApi.get(`/api/products/jobs/${jobId}`, adminToken);
  95  |     if (jobRes.body.data.state === 'completed') {
  96  |       productId = jobRes.body.data.result.id;
  97  |       break;
  98  |     }
  99  |     await new Promise((r) => setTimeout(r, 1000));
  100 |   }
  101 |   expect(productId).toBeTruthy();
  102 |   await expect(adminPage.getByText('Product created.')).toBeVisible({ timeout: 10000 });
  103 | 
  104 |   const productCheck = await realApi.getProduct(productId);
  105 |   expect(productCheck.body.data.stock).toBe(5);
  106 | 
  107 |   // === FRONTEND: a real customer discovers the product the admin just created ===
  108 |   const customerContext = await browser.newContext({ baseURL: FRONTEND_REAL_BASE_URL });
  109 |   const customerPage = await customerContext.newPage();
  110 |   // /search (not /products) is the page that actually fires
  111 |   // /api/products?search= — see customer-journey.spec.js's identical note.
  112 |   await customerPage.goto('/search');
  113 |   await customerPage.getByTestId('search-results-input').fill(productName);
  114 |   await customerPage.waitForResponse((res) => res.url().includes('/api/products?') && res.url().includes('search='));
  115 |   await expect(customerPage.getByTestId(`product-card-${productId}`)).toBeVisible({ timeout: 10000 });
  116 | 
  117 |   // Real login for the customer.
  118 |   await customerPage.goto('/login');
  119 |   await customerPage.getByTestId('login-phone-input').fill(E2E_CUSTOMER_PHONE);
  120 |   await customerPage.getByTestId('login-send-otp-button').click();
  121 |   await expect(customerPage.getByTestId('login-otp-hidden-input')).toBeVisible({ timeout: 10000 });
  122 |   await customerPage.getByTestId('login-otp-hidden-input').fill(E2E_OTP);
  123 |   await customerPage.getByTestId('login-verify-button').click();
  124 |   await expect(customerPage.getByTestId('login-fullname-input')).toBeVisible({ timeout: 10000 });
  125 |   await customerPage.getByTestId('login-skip-button').click();
  126 |   await expect(customerPage.getByTestId('login-start-shopping-button')).toBeVisible({ timeout: 10000 });
  127 |   const customerToken = await customerPage.evaluate(() => window.sessionStorage.getItem('authToken'));
  128 | 
  129 |   // Ensure a delivery address exists (idempotent — real backend allows
  130 |   // multiple; this cross-system spec doesn't depend on any other spec's
  131 |   // run order).
  132 |   await realApi.createAddress(
  133 |     { ...E2E_ADDRESS, phone: '9876500095', houseArea: `${Date.now()} Cross-System Lane` },
  134 |     customerToken
  135 |   );
  136 | 
  137 |   await customerPage.goto(`/product/${productId}`);
  138 |   await customerPage.getByTestId('product-detail-add-to-cart-button').click();
  139 |   await customerPage.goto('/checkout');
  140 |   await expect(customerPage.getByTestId('address-selection-continue-button')).toBeEnabled({ timeout: 15000 });
  141 |   await customerPage.getByTestId('address-selection-continue-button').click();
  142 |   await customerPage.waitForURL(/\/checkout\/review$/, { timeout: 15000 });
  143 |   await expect(customerPage.getByTestId('review-proceed-to-payment-button')).toBeEnabled({ timeout: 15000 });
  144 |   await customerPage.getByTestId('review-proceed-to-payment-button').click();
  145 |   await customerPage.waitForURL(/\/checkout\/payment$/, { timeout: 15000 });
  146 |   await customerPage.getByTestId('payment-method-cod').check({ force: true });
  147 | 
  148 |   const placeRes = customerPage.waitForResponse(
  149 |     (res) => res.url().includes('/api/payment/cod') && res.request().method() === 'POST'
  150 |   );
  151 |   await customerPage.getByTestId('payment-place-order-button').click();
  152 |   const placed = await placeRes;
  153 |   expect(placed.status()).toBe(200);
  154 |   await customerPage.waitForURL(/\/order\/success\//, { timeout: 15000 });
  155 |   const orderId = customerPage.url().split('/order/success/')[1]?.split(/[/?]/)[0];
  156 |   expect(orderId).toBeTruthy();
  157 | 
  158 |   // === DATABASE + INVENTORY: order exists, real stock genuinely decreased ===
  159 |   const orderCheck = await realApi.getOrder(orderId, customerToken);
  160 |   expect(orderCheck.status).toBe(200);
  161 |   expect(orderCheck.body.data.paymentStatus).toBe('cod_pending');
  162 | 
  163 |   const inventoryAfter = await realApi.getInventory(productId, adminToken);
  164 |   expect(inventoryAfter.body.data.stock).toBe(4); // 5 - 1 purchased
  165 | 
```