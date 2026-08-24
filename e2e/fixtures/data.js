// e2e/fixtures/data.js
//
// Deterministic fixture data mirroring the REAL backend response shapes
// documented by inventory of backend/src/modules — every field here maps
// to an actual Prisma model field (prisma/schema.prisma) or an actual
// controller response (see backend inventory notes). Envelope shape
// ({success, message, data, meta}) matches src/utils/sendResponse.js.
// Deliberately NOT randomized (no faker) — deterministic ids/values so
// assertions can target exact text.

const PRODUCT_1 = {
  id: '507f1f77bcf86cd799439011',
  name: 'Advika LED Fog Lamp 72W',
  category: ['Lights'],
  brand: 'Advika',
  price: 2499,
  mrp: 2999,
  stock: 25,
  images: ['/images/placeholder.svg'],
  description: 'High-output 72W LED fog lamp for heavy commercial vehicles.',
  voltage: '24V',
  rating: 4.5,
  reviewCount: 128,
  isBestSeller: true,
  isNewArrival: false,
};

const PRODUCT_2 = {
  id: '507f1f77bcf86cd799439012',
  name: 'Advika Seat Cover Set (Truck)',
  category: ['Accessories'],
  brand: 'Advika',
  price: 1499,
  mrp: 1499,
  stock: 0, // deliberately out of stock — used by OOS scenarios
  images: ['/images/placeholder.svg'],
  description: 'Durable all-weather seat cover set.',
  rating: 4.1,
  reviewCount: 40,
  isBestSeller: false,
  isNewArrival: true,
};

const PRODUCT_LOW_STOCK = {
  id: '507f1f77bcf86cd799439013',
  name: 'Advika 12V Wiring Harness',
  category: ['Electrical & Wiring'],
  brand: 'Advika',
  price: 899,
  mrp: 999,
  stock: 2,
  images: ['/images/placeholder.svg'],
  description: 'Complete 12V wiring harness kit.',
  voltage: '12V',
  rating: 4.0,
  reviewCount: 12,
  isBestSeller: false,
  isNewArrival: false,
};

const PRODUCTS = [PRODUCT_1, PRODUCT_2, PRODUCT_LOW_STOCK];

const USER = {
  id: '607f1f77bcf86cd799439099',
  name: 'Test Customer',
  phone: '+919876543210',
  vehicle: 'Truck',
};

const ADDRESS_1 = {
  id: '707f1f77bcf86cd799439001',
  name: 'Test Customer',
  phone: '+919876543210',
  pincode: '400001',
  city: 'Mumbai',
  state: 'Maharashtra',
  houseArea: '221B, Industrial Estate',
  area: 'Andheri East',
  landmark: 'Near Metro Station',
  isDefault: true,
};

// A valid-format JWT the frontend's jwt.js util can decode for expiry
// checks (header.payload.signature — signature content is irrelevant
// since nothing in the frontend verifies it, only decodes exp/claims).
function makeFakeJwt(payload) {
  const b64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({
    userId: USER.id,
    role: 'customer',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  });
  return `${header}.${body}.fake-signature-for-e2e-only`;
}

const VALID_TOKEN = makeFakeJwt({});
const EXPIRED_TOKEN = makeFakeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });

function envelope(data, meta = {}) {
  return {
    success: true,
    message: 'ok',
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  };
}

function errorEnvelope(message, errors = null) {
  return { success: false, message, errors };
}

export {
  PRODUCT_1,
  PRODUCT_2,
  PRODUCT_LOW_STOCK,
  PRODUCTS,
  USER,
  ADDRESS_1,
  VALID_TOKEN,
  EXPIRED_TOKEN,
  makeFakeJwt,
  envelope,
  errorEnvelope,
};
