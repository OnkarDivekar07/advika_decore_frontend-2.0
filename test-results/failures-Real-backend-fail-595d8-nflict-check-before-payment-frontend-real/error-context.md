# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-real\failures.spec.js >> Real-backend failure scenarios >> product deleted mid-checkout is caught by the real conflict check before payment
- Location: e2e-real\failures.spec.js:190:3

# Error details

```
TypeError: Cannot read properties of undefined (reading 'id')
```

# Test source

```ts
  104 |     const first = await realApi.placeCodOrder(draftOrderId, token);
  105 |     expect(first.status).toBe(200);
  106 |     const firstOrderId = first.body.data.order.id;
  107 |     const second = await realApi.placeCodOrder(draftOrderId, token);
  108 |     // The second call must NOT create a second real order for the same
  109 |     // draft — either it's rejected outright, or it idempotently returns
  110 |     // the same order id as the first (real backend's own
  111 |     // `alreadyProcessed` no-op path — see handleCODOrder), never a second
  112 |     // Order row for one checkout.
  113 |     if (second.status === 200) {
  114 |       expect(second.body.data.order.id).toBe(firstOrderId);
  115 |       expect(second.body.data.alreadyProcessed).toBe(true);
  116 |     } else {
  117 |       expect(second.status).toBeGreaterThanOrEqual(400);
  118 |     }
  119 | 
  120 |     const history = await realApi.getOrderHistory(token);
  121 |     const matchingOrders = history.body.data.filter((o) => o.id === firstOrderId);
  122 |     expect(matchingOrders.length).toBe(1);
  123 |   });
  124 | 
  125 |   test('inventory conflict: buying the real last unit leaves 0 stock, and a second buyer is correctly refused', async () => {
  126 |     // KNOWN BUG (see final report): Order.payment_order_id is `String?
  127 |     // @unique` in prisma/schema.prisma. MongoDB's default unique index
  128 |     // treats null as a real value, so AT MOST ONE order in the entire
  129 |     // database can have payment_order_id: null (i.e. be an unpaid draft)
  130 |     // at any moment — confirmed by direct reproduction against the real
  131 |     // database. This makes it structurally impossible, right now, for two
  132 |     // different customers to hold two draft orders open at the same
  133 |     // instant (the second createDraftOrder call fails with a raw Prisma
  134 |     // P2002 error, not a handled response) — so a literal "two customers
  135 |     // click Place Order at the exact same millisecond" race can't be
  136 |     // driven at all until that's fixed. This test instead verifies the
  137 |     // part of real inventory-safety that IS currently exercisable: a real
  138 |     // purchase that takes the last unit genuinely leaves 0 real stock, and
  139 |     // a second real customer's subsequent real attempt to buy the
  140 |     // (now out-of-stock) item is genuinely refused by the real backend —
  141 |     // each draft order is fully completed (paid) before the next is
  142 |     // created, specifically to avoid tripping the bug above.
  143 |     const adminLogin = await realApi.adminLogin('e2e-admin@advika-e2e.test', 'E2eAdmin@12345');
  144 |     const adminToken = adminLogin.body.data.token;
  145 |     const products = await realApi.get('/api/products?search=SlimBar');
  146 |     const product = products.body.data[0];
  147 | 
  148 |     const addressFor = async (token, phone) =>
  149 |       (await realApi.createAddress(
  150 |         { name: 'E2E Race', phone, pincode: '411001', city: 'Pune', houseArea: '1 Race Lane', area: 'Camp', state: 'Maharashtra' },
  151 |         token
  152 |       )).body.data.id;
  153 | 
  154 |     // Drain every real unit of real stock, one fully-completed real
  155 |     // purchase at a time (never two open drafts at once).
  156 |     const inventory = await realApi.getInventory(product.id, adminToken);
  157 |     let remaining = inventory.body?.data?.stock ?? product.stock;
  158 |     let drainCount = 0;
  159 |     while (remaining > 0) {
  160 |       drainCount += 1;
  161 |       const drainToken = await realApi.loginCustomer(`981234568${drainCount}`, E2E_OTP);
  162 |       const addr = await addressFor(drainToken, `987650020${drainCount}`);
  163 |       await realApi.addToCart(product.id, 1, drainToken);
  164 |       const drainDraft = await realApi.createDraftOrder(addr, drainToken);
  165 |       const placed = await realApi.placeCodOrder(drainDraft.body.data.id, drainToken);
  166 |       if (placed.status === 200) remaining -= 1;
  167 |       else break;
  168 |     }
  169 | 
  170 |     const inventoryAfter = await realApi.getInventory(product.id, adminToken);
  171 |     expect(inventoryAfter.body.data.stock).toBe(0);
  172 | 
  173 |     // A subsequent real customer's real attempt to buy the now-0-stock
  174 |     // item is genuinely refused.
  175 |     const lateBuyer = await realApi.loginCustomer('9812345699', E2E_OTP);
  176 |     const lateAttempt = await realApi.addToCart(product.id, 1, lateBuyer);
  177 |     expect(lateAttempt.status).toBeGreaterThanOrEqual(400);
  178 |     expect(lateAttempt.status).toBeLessThan(500);
  179 |   });
  180 | 
  181 |   // Runs LAST in this file deliberately: this test's real backend
  182 |   // rejection leaves the customer's real draft order stuck with
  183 |   // payment_order_id: null forever (the conflict check refuses the COD
  184 |   // placement that would otherwise clear it) — combined with the same
  185 |   // schema bug documented above, that means this one test would otherwise
  186 |   // block every subsequent test (or real customer!) in the whole suite
  187 |   // from ever creating a NEW draft order, since only one null
  188 |   // payment_order_id can exist system-wide at a time. Keeping it last
  189 |   // contains the blast radius to nothing else in this file.
  190 |   test('product deleted mid-checkout is caught by the real conflict check before payment', async () => {
  191 |     const adminLogin = await realApi.adminLogin('e2e-admin@advika-e2e.test', 'E2eAdmin@12345');
  192 |     expect(adminLogin.status).toBe(200);
  193 |     const adminToken = adminLogin.body.data.token;
  194 | 
  195 |     const buyerToken = await realApi.loginCustomer('9812345679', E2E_OTP);
  196 |     const address = await realApi.createAddress(
  197 |       { name: 'E2E Deleted Product', phone: '9876500093', pincode: '411001', city: 'Pune', houseArea: '1 Gone Lane', area: 'Camp', state: 'Maharashtra' },
  198 |       buyerToken
  199 |     );
  200 |     // A throwaway real product created purely so this test can delete it
  201 |     // out from under an in-progress checkout — never touches the real
  202 |     // seeded catalog.
  203 |     const productsBefore = await realApi.get('/api/products?search=Braided+Wiring');
> 204 |     const productId = productsBefore.body.data[0].id;
      |                                                   ^ TypeError: Cannot read properties of undefined (reading 'id')
  205 | 
  206 |     await realApi.addToCart(productId, 1, buyerToken);
  207 |     const draft = await realApi.createDraftOrder(address.body.data.id, buyerToken);
  208 |     const draftOrderId = draft.body.data.id;
  209 | 
  210 |     // Real admin deletes the product the customer already has in their
  211 |     // real draft order.
  212 |     const del = await realApi.del(`/api/products/${productId}`, adminToken);
  213 |     expect(del.status).toBe(200);
  214 | 
  215 |     // The real backend's own conflict detection (order.service.js's
  216 |     // detectOrderConflicts, called from create-orderid / COD placement)
  217 |     // must catch this before money changes hands — never silently charge
  218 |     // for a since-deleted product.
  219 |     const attempt = await realApi.placeCodOrder(draftOrderId, buyerToken);
  220 |     expect(attempt.status).toBeGreaterThanOrEqual(400);
  221 |     expect(attempt.status).toBeLessThan(500);
  222 | 
  223 |     // Test-only cleanup for the real bug documented above this test — see
  224 |     // dbCleanup.cjs's header comment. This is NOT how the real app would
  225 |     // recover from this state today (it currently can't, on its own).
  226 |     await deleteStuckDraftOrder(draftOrderId);
  227 |   });
  228 | });
  229 | 
```