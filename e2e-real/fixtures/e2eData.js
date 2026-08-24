// e2e-real/fixtures/e2eData.js — deterministic-but-unique test data for the
// real full-stack layer. The E2E database (backend 2.0/.env.e2e) is wiped
// and reseeded before a full run (`npm run e2e:setup` in backend 2.0), so
// fixed identifiers are safe to reuse across runs for anything the seed
// itself creates (the customer phone number, the admin account); anything
// a test creates live (an address, a product) gets a run-unique suffix so
// two runs against a non-reset database — e.g. re-running one failed spec
// — never collide.
export const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

// A valid Indian mobile prefix (6-9) — see phoneValidation.js's
// INDIAN_MOBILE_LOCAL_REGEX. Fixed (not run-unique): the OTP mock always
// accepts "123456" regardless of phone, and reusing the same customer
// account across runs is intentional — see header comment.
export const E2E_CUSTOMER_PHONE = '9812345670';
export const E2E_OTP = '123456';

export const E2E_ADDRESS = {
  name: `E2E Test Customer ${runId}`,
  phone: '9876500011',
  pincode: '411001',
  city: 'Pune',
  houseArea: `${runId}, E2E Test Lane`,
  area: 'Camp',
  state: 'Maharashtra',
};

export const E2E_ADDRESS_INVALID = {
  name: 'E2E Invalid Address',
  // First digit 5 is not a valid Indian mobile prefix.
  phone: '5123456789',
  // Leading 0 is not a valid Indian postal zone.
  pincode: '000000',
  city: 'Pune',
  houseArea: '1 Nowhere Lane',
  area: 'Camp',
  state: 'Maharashtra',
};

export function uniqueProductName(label) {
  return `E2E-${label}-${runId}`;
}
