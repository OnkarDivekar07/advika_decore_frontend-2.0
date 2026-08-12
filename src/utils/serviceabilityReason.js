// src/utils/serviceabilityReason.js
//
// Turns the backend's checkServiceability `reason` field (see the
// backend's shipping.service.js — 'INVALID_FORMAT' | 'INVALID_PINCODE' |
// 'AREA_NOT_COVERED' | null) into the right user-facing copy. A pincode
// that isn't even shaped right or doesn't exist at all reads very
// differently to a shopper than one that's real but just not covered yet —
// this is the single place that distinction is worded, so every
// pincode-check widget (ProductDetails, AddressForm, ReviewPage) shows the
// same messages instead of each re-deriving its own copy of a generic
// "not serviceable" string. Note this never has to name the carrier or
// interpret a carrier-specific code itself — the backend has already
// normalized `reason` down to these three values before it ever reaches
// here.
export function getNotServiceableMessage(t, reason) {
  if (reason === 'INVALID_FORMAT' || reason === 'INVALID_PINCODE') {
    return t(
      'checkout.invalidPincode',
      "That doesn't look like a valid pincode — please double-check it."
    );
  }
  return t('checkout.notServiceable', "We don't deliver to this pincode yet");
}
