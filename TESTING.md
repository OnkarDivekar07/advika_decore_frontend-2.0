# Frontend testing strategy

## Tooling

- **Vitest** (shares Vite's config/aliases, fast, ESM-native) + **jsdom**
- **@testing-library/react** for hooks/components, **@testing-library/user-event**
  for realistic input simulation
- No new runtime dependencies — only devDependencies, and only for `npm test`

```bash
npm test              # run once (CI mode)
npm run test:watch    # watch mode for local dev
npm run test:coverage # coverage report (v8, text + html)
```

Config lives in `vitest.config.js` (separate from `vite.config.js` so
test-only settings never leak into the production build) and
`src/test/setup.js` (jest-dom matchers + minimal jsdom polyfills).

## What's covered, and why

The backend already has a Jest/Supertest suite covering the same business
domains server-side. This suite focuses on the frontend, where almost all
of the actual business logic (cart merging, optimistic updates, checkout
orchestration, payment reconciliation, client-side rate limiting) lives in
custom hooks and Context providers rather than in components — so that's
where these tests target their assertions, on the hook's/context's public
state and return values, not on rendered markup or internal implementation
details. `CartContext` and `CheckoutContext` are tested as the units they
are (via `renderHook`), with their service-layer dependencies mocked at
the module boundary — the same seam a real network failure or a real
backend response would cross.

| Priority area | Test files |
|---|---|
| Authentication / OTP | `features/auth/hooks/__tests__/useOtpFlow.test.js` |
| Cart | `features/cart/__tests__/cartUtils.test.js`, `contexts/__tests__/CartContext.test.jsx` |
| Product search | `features/products/hooks/__tests__/useProductSearch.test.js`, `useDebouncedValue.test.js`, `features/products/utils/__tests__/searchTermTranslation.test.js` |
| Product details / serviceability | covered indirectly via `AddressForm.test.jsx`'s use of `useServiceabilityCheck` |
| Checkout / payment state | `contexts/__tests__/CheckoutContext.test.jsx`, `services/__tests__/paymentService.test.js` |
| Address validation | `components/Address/__tests__/AddressForm.test.jsx`, `features/address/hooks/__tests__/useAddressBook.test.js`, `utils/__tests__/phoneValidation.test.js`, `pincodeValidation.test.js` |
| Coupon behavior | `services/__tests__/cartService.test.js` (coupon section), `CartContext.test.jsx` |
| Order creation / history | `services/__tests__/orderService.test.js`, `features/orders/hooks/__tests__/useOrderHistory.test.js`, `features/orders/utils/__tests__/paymentStatus.test.js` |
| Duplicate-click protection | `utils/__tests__/apiClient.test.js` (in-flight request dedupe) |
| Core auth/session utils | `utils/__tests__/jwt.test.js`, `authUtils.test.js`, `checkoutStorage.test.js` |

Every suite above exercises, where applicable: the happy path, validation
failures, simulated API failures (4xx/5xx/network), loading states,
duplicate-submit/double-click guards, and refresh/navigation-restore
behavior (e.g. `CheckoutContext`'s pending-payment restore-on-mount, and
`useOrderHistory`'s free re-slice on browser Back).

## What's intentionally not tested

- Pure presentational markup/styling (no snapshot tests) — nothing here
  asserts on class names or DOM structure beyond what's needed to find an
  element (role/label) or confirm a user-visible message is present.
- Third-party libraries (Razorpay Checkout.js, react-toastify) are mocked
  at their boundary rather than exercised for real.
- End-to-end/browser tests are out of scope for this pass; this suite is
  unit/integration-level (hooks, contexts, services, one representative
  form component).
