// src/config/advikaAuto.js
//
// Domain constants for the Advika Auto storefront — see
// design_handoff_advika_auto/README.md, particularly the "Domain rule:
// 12V vs 24V" section. Vehicle *class* (how big the vehicle is) and
// product *category* (what kind of part it is) are two different axes;
// this file is the single source of truth for both so no page has to
// redefine them (see the README's explicit warning against a per-page
// SKUS/voltage map drifting from the shared one).

export const BRAND_PHONE_E164 = '+919876543210';
export const BRAND_PHONE_DISPLAY = '+91 98765 43210';
export const BRAND_PHONE_TEL = `tel:${BRAND_PHONE_E164}`;
export const BRAND_WHATSAPP_URL = `https://wa.me/919876543210`;

// Vehicle classes — grouped by size in driver language, not formal
// vehicle classes (see README). `voltage` drives which product-listing
// filter chips apply and which fitment group a product belongs to.
export const VEHICLE_CLASSES = [
  {
    id: 'small',
    icon: 'airport_shuttle',
    iconSize: 26,
    voltage: '12V',
    models: [
      'Tata Ace', 'Tata Ace Gold', 'Tata Intra V30', 'Ashok Leyland Bada Dost',
      'Mahindra Bolero Pik-Up', 'Mahindra Jeeto', 'Maruti Super Carry',
      'Isuzu D-Max', 'Tata Yodha', 'Piaggio Ape Xtra',
    ],
  },
  {
    id: 'medium',
    icon: 'local_shipping',
    iconSize: 29,
    voltage: '24V',
    models: [
      'Tata 1109', 'Tata 1512', 'Ashok Leyland Ecomet 1215', 'Ashok Leyland Boss',
      'Eicher Pro 3015', 'Eicher Pro 2110', 'BharatBenz 1217C', 'Mahindra Furio 7',
      'Tata LPT 1618', 'SML Isuzu Sartaj',
    ],
  },
  {
    id: 'big',
    icon: 'local_shipping',
    iconSize: 34,
    voltage: '24V',
    models: [
      'Tata Signa 2823', 'Tata Signa 4825', 'Tata Prima 4928', 'Ashok Leyland 1616',
      'Ashok Leyland 3520', 'BharatBenz 1917', 'BharatBenz 2823', 'Eicher Pro 6037',
      'Mahindra Blazo X', 'Volvo FM 400',
    ],
  },
  {
    id: 'tractor',
    icon: 'agriculture',
    iconSize: 29,
    voltage: '12V',
    models: [
      'Mahindra 575 DI', 'Mahindra Arjun 605', 'Swaraj 744 FE', 'Swaraj 855',
      'Sonalika DI 745', 'John Deere 5310', 'Massey Ferguson 241',
      'New Holland 3630', 'Eicher 380', 'Farmtrac 60',
    ],
  },
];

export const getVehicleClass = (id) => VEHICLE_CLASSES.find((v) => v.id === id) || VEHICLE_CLASSES[0];

// Product categories — the catalog's real browsing taxonomy, independent
// of vehicle class. `voltageRelevant` categories are the only ones that
// show the 12V/24V filter chips on the Category page (voltage is
// meaningless for seat covers, mud flaps, etc.). `chip: false` means the
// category is reachable (landing tile, direct link) but doesn't get its
// own chip on the Category listing's filter row — matches the design's
// own chip row, which is shorter than its full landing tile grid.
export const CATEGORIES = [
  { id: 'lights', label: 'Lights', icon: 'wb_incandescent', voltageRelevant: true, chip: true, feature: true },
  { id: 'horns', label: 'Horns & Air', icon: 'volume_up', voltageRelevant: false, chip: true },
  { id: 'interior', label: 'Interior & Comfort', icon: 'airline_seat_recline_extra', voltageRelevant: false, chip: true },
  { id: 'exterior', label: 'Exterior Styling', icon: 'auto_awesome', voltageRelevant: false, chip: true },
  { id: 'electrical', label: 'Electrical & Wiring', icon: 'cable', voltageRelevant: true, chip: true },
  { id: 'safety', label: 'Safety & Tools', icon: 'health_and_safety', voltageRelevant: false, chip: false },
  { id: 'spares', label: 'Spares & Fitting', icon: 'build', voltageRelevant: false, chip: true },
];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);
// Backend Product.category is a free-text String[] (see prisma/schema.prisma) —
// this is the canonical English label each category id maps to, so the
// listing's URL param and the API's `category` filter agree with what
// products are actually seeded with (see the backend seed task).
export const getCategoryByLabel = (label) => CATEGORIES.find((c) => c.label === label);

// Reads a product's voltage field tolerant of a couple of shapes the
// backend might eventually send it in, and classifies it the way the
// design system does: dual vs single vs none. Renders nothing (no
// badge/section) when the SKU carries no voltage at all — e.g. seat
// covers, mud flaps — per the README's "two static style branches, not
// one badge with an interpolated colour" rule.
export function getVoltageInfo(product) {
  const raw = product?.voltage;
  if (!raw) return { hasVoltage: false, isDual: false, values: [] };
  const values = Array.isArray(raw) ? raw : String(raw).split(/[\s/,]+/).filter(Boolean);
  const has12 = values.some((v) => /12/.test(v));
  const has24 = values.some((v) => /24/.test(v));
  return {
    hasVoltage: true,
    isDual: has12 && has24,
    has12,
    has24,
    values,
    label: has12 && has24 ? '12V+24V' : has24 ? '24V' : has12 ? '12V' : String(raw),
  };
}

// Product detail's "Fits these vehicles" section chips a per-model icon —
// trucks/pickups vs tempos vs tractors (README's Domain rule table:
// "a 15px #a3a3a3 vehicle icon — local_shipping for trucks and pickups,
// airport_shuttle for tempos, agriculture for tractors"). Product.compatibility
// only stores plain model-name strings (no vehicle-type field), so this
// classifies by keyword against the same real model names VEHICLE_CLASSES
// above already uses — kept name-based rather than adding a schema field
// since there's no other consumer that would need a structured type.
const TEMPO_KEYWORDS = ['intra', 'ape', 'tempo', 'super carry', 'jeeto', 'd-max', 'yodha'];
const TRACTOR_KEYWORDS = [
  'mahindra 5', 'mahindra arjun', 'swaraj', 'sonalika', 'john deere',
  'massey ferguson', 'new holland', 'eicher 380', 'farmtrac',
];
export function getVehicleIcon(modelName) {
  const name = String(modelName || '').toLowerCase();
  if (TRACTOR_KEYWORDS.some((k) => name.includes(k))) return 'agriculture';
  if (TEMPO_KEYWORDS.some((k) => name.includes(k))) return 'airport_shuttle';
  return 'local_shipping';
}
