# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-real\cross-system\full-lifecycle.spec.js >> full cross-system lifecycle: admin creates a product a real customer buys, ships, and sees update
- Location: e2e-real\cross-system\full-lifecycle.spec.js:53:1

# Error details

```
Error: expect(received).toBeTruthy()

Received: undefined
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - link "Skip to main content" [ref=f1e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f1e5]:
    - generic [ref=f1e6]:
      - generic [ref=f1e7]:
        - text: 
        - img "E-commerce Admin Panel logo" [ref=f1e8]
        - heading "Advika Decore Admin" [level=1] [ref=f1e9]
      - generic [ref=f1e10]:
        - link "Operational alerts, 2 needing attention" [ref=f1e11] [cursor=pointer]:
          - /url: /alerts
          - generic [ref=f1e12]: 
          - generic [ref=f1e13]: "2"
        - button "ADMIN" [ref=f1e14] [cursor=pointer]:
          - generic [ref=f1e16]: 
        - button "Logout" [ref=f1e17] [cursor=pointer]:
          - generic [ref=f1e18]: 
  - generic [ref=f1e20]:
    - complementary "Admin navigation" [ref=f1e21]:
      - text: 
      - navigation [ref=f1e22]:
        - link "Dashboard" [ref=f1e23] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=f1e24]: 
        - link "Alerts" [ref=f1e26] [cursor=pointer]:
          - /url: /alerts
          - generic [ref=f1e27]: 
        - link "Analytics" [ref=f1e29] [cursor=pointer]:
          - /url: /analytics
          - generic [ref=f1e30]: 
        - link "Products" [ref=f1e32] [cursor=pointer]:
          - /url: /products
          - generic [ref=f1e33]: 
        - link "Orders" [ref=f1e35] [cursor=pointer]:
          - /url: /orders
          - generic [ref=f1e36]: 
        - link "Users" [ref=f1e38] [cursor=pointer]:
          - /url: /users
          - generic [ref=f1e39]: 
        - link "Inventory" [ref=f1e41] [cursor=pointer]:
          - /url: /inventory
          - generic [ref=f1e42]: 
        - link "Content" [ref=f1e44] [cursor=pointer]:
          - /url: /content
          - generic [ref=f1e45]: 
        - link "Settings" [ref=f1e47] [cursor=pointer]:
          - /url: /settings
          - generic [ref=f1e48]: 
    - main [ref=f1e50]:
      - navigation "Breadcrumb" [ref=f1e51]:
        - list [ref=f1e52]:
          - listitem [ref=f1e53]:
            - link "Dashboard" [ref=f1e54] [cursor=pointer]:
              - /url: /dashboard
          - listitem [ref=f1e55]:
            - generic [ref=f1e56]: 
            - generic [ref=f1e57]: Products
      - generic [ref=f1e58]:
        - generic [ref=f1e59]:
          - heading "Products" [level=1] [ref=f1e60]
          - paragraph [ref=f1e61]: Manage the product catalog — pricing, stock, and images.
        - button "Add New Product" [ref=f1e63] [cursor=pointer]:
          - generic [ref=f1e64]: +
          - text: Add New Product
      - generic [ref=f1e66]:
        - heading "Add New Product" [level=2] [ref=f1e67]
        - alert [ref=f1e68]:
          - generic [ref=f1e70]:
            - generic [ref=f1e71]: 
            - generic [ref=f1e72]: Still processing — this is taking longer than expected. The product list will update once it finishes; you can safely close this form.
        - generic [ref=f1e73]:
          - generic [ref=f1e74]: Product name
          - textbox "Product name" [ref=f1e75]:
            - /placeholder: e.g. Heavy Duty Tarpaulin
            - text: E2E-CrossSystem-1787596167270-13914
        - group "Select categories" [ref=f1e76]:
          - generic [ref=f1e78]:
            - generic [ref=f1e79]:
              - checkbox "Lights" [ref=f1e80]
              - generic [ref=f1e81]: Lights
            - generic [ref=f1e82]:
              - checkbox "Horns & Air" [ref=f1e83]
              - generic [ref=f1e84]: Horns & Air
            - generic [ref=f1e85]:
              - checkbox "Interior & Comfort" [ref=f1e86]
              - generic [ref=f1e87]: Interior & Comfort
            - generic [ref=f1e88]:
              - checkbox "Exterior Styling" [ref=f1e89]
              - generic [ref=f1e90]: Exterior Styling
            - generic [ref=f1e91]:
              - checkbox "Electrical & Wiring" [ref=f1e92]
              - generic [ref=f1e93]: Electrical & Wiring
            - generic [ref=f1e94]:
              - checkbox "Safety & Tools" [checked] [ref=f1e95]
              - generic [ref=f1e96]: Safety & Tools
            - generic [ref=f1e97]:
              - checkbox "Spares & Fitting" [ref=f1e98]
              - generic [ref=f1e99]: Spares & Fitting
        - generic [ref=f1e100]:
          - generic [ref=f1e101]: Brand
          - textbox "Brand" [ref=f1e102]:
            - /placeholder: e.g. Advika
            - text: Advika E2E
        - generic [ref=f1e103]:
          - generic [ref=f1e104]:
            - generic [ref=f1e105]: Price (₹)
            - spinbutton "Price (₹)" [ref=f1e106]: "850"
          - generic [ref=f1e107]:
            - generic [ref=f1e108]: MRP (₹, optional)
            - spinbutton "MRP (₹, optional)" [ref=f1e109]
        - generic [ref=f1e110]:
          - generic [ref=f1e111]: Stock quantity
          - spinbutton "Stock quantity" [ref=f1e112]: "5"
        - generic [ref=f1e113]:
          - generic [ref=f1e114]: Voltage (optional)
          - combobox "Voltage (optional)" [ref=f1e115]:
            - option "No voltage (non-electrical part)" [selected]
            - option "12V"
            - option "24V"
            - option "12V/24V"
        - generic [ref=f1e116]:
          - generic [ref=f1e117]: Description
          - textbox "Description" [ref=f1e118]:
            - /placeholder: Describe the product…
            - text: Cross-system E2E product.
        - generic [ref=f1e119]:
          - generic [ref=f1e120]: "Specifications (optional, one per line as \"Key: Value\")"
          - 'textbox "Specifications (optional, one per line as \"Key: Value\")" [ref=f1e121]':
            - /placeholder: "Wattage: 100W\nLumens: 9,000 lm\nIP Rating: IP68"
        - group "Vehicle compatibility (optional)" [ref=f1e122]:
          - generic [ref=f1e124]:
            - generic [ref=f1e125]:
              - generic [ref=f1e126]: 12V vehicles (comma-separated)
              - textbox "12V vehicles (comma-separated)" [ref=f1e127]:
                - /placeholder: Tata Ace, Mahindra Bolero Pickup
            - generic [ref=f1e128]:
              - generic [ref=f1e129]: 24V vehicles (comma-separated)
              - textbox "24V vehicles (comma-separated)" [ref=f1e130]:
                - /placeholder: Tata Signa 4825, Ashok Leyland 3718
        - group "Variants (optional — e.g. different wattages at different prices)" [ref=f1e131]:
          - button "+ Add variant group" [ref=f1e134] [cursor=pointer]
        - generic [ref=f1e135]:
          - generic [ref=f1e136]:
            - generic [ref=f1e137]: Rating (0–5, optional)
            - spinbutton "Rating (0–5, optional)" [ref=f1e138]
          - generic [ref=f1e139]:
            - generic [ref=f1e140]: Review count (optional)
            - spinbutton "Review count (optional)" [ref=f1e141]
        - generic [ref=f1e142]:
          - checkbox "New arrival?" [ref=f1e143]
          - text: New arrival?
        - generic [ref=f1e144]:
          - checkbox "Best seller?" [ref=f1e145]
          - text: Best seller?
        - generic [ref=f1e146]:
          - generic [ref=f1e147]: Product images
          - button "Product images" [ref=f1e148]
        - generic [ref=f1e149]:
          - button "Add Product" [ref=f1e150] [cursor=pointer]
          - button "Cancel" [ref=f1e151] [cursor=pointer]
      - generic [ref=f1e153]:
        - generic [ref=f1e154]:
          - generic [ref=f1e155]: Search products
          - searchbox "Search products" [ref=f1e156]
        - combobox "Filter by category" [ref=f1e157]:
          - option "All categories" [selected]
          - option "Lights"
          - option "Horns & Air"
          - option "Interior & Comfort"
          - option "Exterior Styling"
          - option "Electrical & Wiring"
          - option "Safety & Tools"
          - option "Spares & Fitting"
        - textbox "Filter by brand" [ref=f1e158]:
          - /placeholder: Brand
        - combobox "Filter by stock status" [ref=f1e159]:
          - option "Any stock level" [selected]
          - option "In stock"
          - option "Out of stock"
        - combobox "Filter by new arrival" [ref=f1e160]:
          - 'option "New arrival: any" [selected]'
          - option "New arrivals only"
          - option "Not new arrivals"
      - generic [ref=f1e161]:
        - table [ref=f1e163]:
          - caption [ref=f1e164]: Products
          - rowgroup [ref=f1e165]:
            - row [ref=f1e166]:
              - columnheader "Image" [ref=f1e167]
              - columnheader "ID" [ref=f1e168]
              - columnheader [ref=f1e169]:
                - button "Name" [ref=f1e170] [cursor=pointer]:
                  - text: Name
                  - generic [ref=f1e171]: 
              - columnheader "Brand" [ref=f1e172]
              - columnheader "Category" [ref=f1e173]
              - columnheader [ref=f1e174]:
                - button "Price" [ref=f1e175] [cursor=pointer]:
                  - text: Price
                  - generic [ref=f1e176]: 
              - columnheader [ref=f1e177]:
                - button "Stock" [ref=f1e178] [cursor=pointer]:
                  - text: Stock
                  - generic [ref=f1e179]: 
              - columnheader "New Arrival" [ref=f1e180]
              - columnheader "Actions" [ref=f1e181]
          - rowgroup [ref=f1e183]:
            - row [ref=f1e184]:
              - cell [ref=f1e185]:
                - img "Universal Mounting Bracket Set" [ref=f1e186]
              - cell "ee6192e9" [ref=f1e187]
              - cell "Universal Mounting Bracket Set" [ref=f1e188]
              - cell "Advika" [ref=f1e189]
              - cell "Spares & Fitting" [ref=f1e190]
              - cell "₹449.00" [ref=f1e191]
              - cell "55 · In Stock" [ref=f1e192]
              - cell "—" [ref=f1e194]
              - cell [ref=f1e195]:
                - generic [ref=f1e196]:
                  - button "Edit Universal Mounting Bracket Set" [ref=f1e197] [cursor=pointer]: Edit
                  - button "Delete Universal Mounting Bracket Set" [ref=f1e198] [cursor=pointer]: Delete
            - row [ref=f1e199]:
              - cell [ref=f1e200]:
                - img "Reflective Safety Triangle Kit" [ref=f1e201]
              - cell "ee6192e8" [ref=f1e202]
              - cell "Reflective Safety Triangle Kit" [ref=f1e203]
              - cell "Advika" [ref=f1e204]
              - cell "Safety & Tools" [ref=f1e205]
              - cell "₹399.00" [ref=f1e206]
              - cell "90 · In Stock" [ref=f1e207]
              - cell "—" [ref=f1e209]
              - cell [ref=f1e210]:
                - generic [ref=f1e211]:
                  - button "Edit Reflective Safety Triangle Kit" [ref=f1e212] [cursor=pointer]: Edit
                  - button "Delete Reflective Safety Triangle Kit" [ref=f1e213] [cursor=pointer]: Delete
            - row [ref=f1e214]:
              - cell [ref=f1e215]:
                - img "Braided Wiring Harness Kit" [ref=f1e216]
              - cell "ee6192e7" [ref=f1e217]
              - cell "Braided Wiring Harness Kit" [ref=f1e218]
              - cell "Advika" [ref=f1e219]
              - cell "Electrical & Wiring" [ref=f1e220]
              - cell "₹1899.00" [ref=f1e221]
              - cell "22 · In Stock" [ref=f1e222]
              - cell "—" [ref=f1e224]
              - cell [ref=f1e225]:
                - generic [ref=f1e226]:
                  - button "Edit Braided Wiring Harness Kit" [ref=f1e227] [cursor=pointer]: Edit
                  - button "Delete Braided Wiring Harness Kit" [ref=f1e228] [cursor=pointer]: Delete
            - row [ref=f1e229]:
              - cell [ref=f1e230]:
                - img "12V Reverse Horn with Sensor" [ref=f1e231]
              - cell "ee6192e6" [ref=f1e232]
              - cell "12V Reverse Horn with Sensor" [ref=f1e233]
              - cell "Advika" [ref=f1e234]
              - cell "Horns & Air" [ref=f1e235]
              - cell "₹1099.00" [ref=f1e236]
              - cell "45 · In Stock" [ref=f1e237]
              - cell "—" [ref=f1e239]
              - cell [ref=f1e240]:
                - generic [ref=f1e241]:
                  - button "Edit 12V Reverse Horn with Sensor" [ref=f1e242] [cursor=pointer]: Edit
                  - button "Delete 12V Reverse Horn with Sensor" [ref=f1e243] [cursor=pointer]: Delete
            - row [ref=f1e244]:
              - cell [ref=f1e245]:
                - img "Cotton Dash Mat, Large" [ref=f1e246]
              - cell "ee6192e5" [ref=f1e247]
              - cell "Cotton Dash Mat, Large" [ref=f1e248]
              - cell "Advika" [ref=f1e249]
              - cell "Interior & Comfort" [ref=f1e250]
              - cell "₹549.00" [ref=f1e251]
              - cell "0 · Out of Stock" [ref=f1e252]
              - cell "—" [ref=f1e254]
              - cell [ref=f1e255]:
                - generic [ref=f1e256]:
                  - button "Edit Cotton Dash Mat, Large" [ref=f1e257] [cursor=pointer]: Edit
                  - button "Delete Cotton Dash Mat, Large" [ref=f1e258] [cursor=pointer]: Delete
            - row [ref=f1e259]:
              - cell [ref=f1e260]:
                - img "SlimBar 72W LED Light Bar" [ref=f1e261]
              - cell "ee6192e4" [ref=f1e262]
              - cell "SlimBar 72W LED Light Bar" [ref=f1e263]
              - cell "Advika" [ref=f1e264]
              - cell "Lights" [ref=f1e265]
              - cell "₹9999.00" [ref=f1e266]
              - cell "3 · Low Stock" [ref=f1e267]
              - cell "—" [ref=f1e269]
              - cell [ref=f1e270]:
                - generic [ref=f1e271]:
                  - button "Edit SlimBar 72W LED Light Bar" [ref=f1e272] [cursor=pointer]: Edit
                  - button "Delete SlimBar 72W LED Light Bar" [ref=f1e273] [cursor=pointer]: Delete
            - row [ref=f1e274]:
              - cell [ref=f1e275]:
                - img "FogMaster Dual Beam Set" [ref=f1e276]
              - cell "ee6192e3" [ref=f1e277]
              - cell "FogMaster Dual Beam Set" [ref=f1e278]
              - cell "Advika" [ref=f1e279]
              - cell "Lights" [ref=f1e280]
              - cell "₹7299.00" [ref=f1e281]
              - cell "20 · In Stock" [ref=f1e282]
              - cell "—" [ref=f1e284]
              - cell [ref=f1e285]:
                - generic [ref=f1e286]:
                  - button "Edit FogMaster Dual Beam Set" [ref=f1e287] [cursor=pointer]: Edit
                  - button "Delete FogMaster Dual Beam Set" [ref=f1e288] [cursor=pointer]: Delete
            - row [ref=f1e289]:
              - cell [ref=f1e290]:
                - img "Steering Cover + Knob Combo" [ref=f1e291]
              - cell "ee6192e2" [ref=f1e292]
              - cell "Steering Cover + Knob Combo" [ref=f1e293]
              - cell "Advika" [ref=f1e294]
              - cell "Interior & Comfort" [ref=f1e295]
              - cell "₹649.00" [ref=f1e296]
              - cell "80 · In Stock" [ref=f1e297]
              - cell "—" [ref=f1e299]
              - cell [ref=f1e300]:
                - generic [ref=f1e301]:
                  - button "Edit Steering Cover + Knob Combo" [ref=f1e302] [cursor=pointer]: Edit
                  - button "Delete Steering Cover + Knob Combo" [ref=f1e303] [cursor=pointer]: Delete
            - row [ref=f1e304]:
              - cell [ref=f1e305]:
                - img "24V Charger + USB Hub" [ref=f1e306]
              - cell "ee6192e1" [ref=f1e307]
              - cell "24V Charger + USB Hub" [ref=f1e308]
              - cell "Advika" [ref=f1e309]
              - cell "Electrical & Wiring" [ref=f1e310]
              - cell "₹749.00" [ref=f1e311]
              - cell "70 · In Stock" [ref=f1e312]
              - cell "—" [ref=f1e314]
              - cell [ref=f1e315]:
                - generic [ref=f1e316]:
                  - button "Edit 24V Charger + USB Hub" [ref=f1e317] [cursor=pointer]: Edit
                  - button "Delete 24V Charger + USB Hub" [ref=f1e318] [cursor=pointer]: Delete
            - row [ref=f1e319]:
              - cell [ref=f1e320]:
                - img "Heavy Duty Mud Flap Set" [ref=f1e321]
              - cell "ee6192e0" [ref=f1e322]
              - cell "Heavy Duty Mud Flap Set" [ref=f1e323]
              - cell "Advika" [ref=f1e324]
              - cell "Exterior Styling" [ref=f1e325]
              - cell "₹899.00" [ref=f1e326]
              - cell "50 · In Stock" [ref=f1e327]
              - cell "—" [ref=f1e329]
              - cell [ref=f1e330]:
                - generic [ref=f1e331]:
                  - button "Edit Heavy Duty Mud Flap Set" [ref=f1e332] [cursor=pointer]: Edit
                  - button "Delete Heavy Duty Mud Flap Set" [ref=f1e333] [cursor=pointer]: Delete
        - generic [ref=f1e334]:
          - paragraph [ref=f1e335]:
            - text: Page 1 of 2
            - generic [ref=f1e336]: (16 total)
          - generic [ref=f1e337]:
            - button "Previous" [disabled] [ref=f1e338]:
              - generic [ref=f1e339]: 
              - text: Previous
            - button "Next" [ref=f1e340] [cursor=pointer]:
              - text: Next
              - generic [ref=f1e341]: 
  - contentinfo [ref=f1e342]:
    - generic [ref=f1e343]: © 2024 E-commerce Admin Panel. All rights reserved.
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
  65  |   await adminPage.goto(ADMIN_REAL_BASE_URL);
  66  |   await adminPage.locator('#email').fill(ADMIN_EMAIL);
  67  |   await adminPage.locator('#password').fill(ADMIN_PASSWORD);
  68  |   await adminPage.locator('button[type="submit"]').click();
  69  |   await expect(adminPage).toHaveURL(/\/dashboard/, { timeout: 10000 });
  70  |   const adminToken = await adminPage.evaluate(() => window.localStorage.getItem('token'));
  71  | 
  72  |   await adminPage.goto(`${ADMIN_REAL_BASE_URL}/products`);
  73  |   await adminPage.getByTestId('products-add-new-btn').click();
  74  |   await adminPage.getByTestId('product-name-input').fill(productName);
  75  |   await adminPage.getByTestId('product-category-checkbox-Safety & Tools').check();
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
> 101 |   expect(productId).toBeTruthy();
      |                     ^ Error: expect(received).toBeTruthy()
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
  166 |   // === ADMIN: the real order appears, admin ships it (real status change) ===
  167 |   await adminPage.goto(`${ADMIN_REAL_BASE_URL}/orders/${orderId}`);
  168 |   await expect(adminPage.getByText('Order Summary')).toBeVisible({ timeout: 15000 });
  169 |   await expect(adminPage.getByTestId('order-create-shipment-btn')).toBeVisible({ timeout: 10000 });
  170 | 
  171 |   const shipRes = adminPage.waitForResponse((res) => res.url().includes(`/api/shipping/${orderId}/create`));
  172 |   await adminPage.getByTestId('order-create-shipment-btn').click();
  173 |   expect((await shipRes).status()).toBe(200);
  174 |   await expect(adminPage.getByTestId('order-refresh-tracking-btn')).toBeVisible({ timeout: 10000 });
  175 | 
  176 |   // === BACKEND: status change genuinely persisted ===
  177 |   const orderAfterShip = await realApi.getOrder(orderId, adminToken);
  178 |   expect(orderAfterShip.body.data.status).toBe('shipped');
  179 | 
  180 |   // === CUSTOMER: sees the real updated status on the real storefront ===
  181 |   await customerPage.goto(`/orders/${orderId}/track`);
  182 |   await expect(customerPage.getByText(`#${orderId}`)).toBeVisible({ timeout: 15000 });
  183 |   await expect(customerPage.getByText('Shipped', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  184 | 
  185 |   await adminContext.close();
  186 |   await customerContext.close();
  187 | });
  188 | 
```