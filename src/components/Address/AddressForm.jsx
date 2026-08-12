// src/components/Address/AddressForm.jsx
//
// Form-UX validation only (required fields, pincode/phone shape) — never
// business-rule validation. Whether an address is actually usable for an
// order is the backend's call at draft-order time, same as everywhere else
// in checkout (see checkout-architecture.md §2). Reused as-is by both the
// checkout address step (AddressSelectionPage) and the standalone address
// book (AddressBookPage) — nothing here is checkout-specific.
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  sanitizePhoneInput,
  isValidIndianMobile,
  toE164,
  fromE164,
} from '@/utils/phoneValidation';
import { sanitizePincodeInput, isValidIndianPincode } from '@/utils/pincodeValidation';
import { useServiceabilityCheck } from '@/features/shipping/hooks/useServiceabilityCheck';
import ServiceabilityMessage from '@/components/Shipping/ServiceabilityMessage';

const DELIVERY_INSTRUCTIONS_MAX = 200;

const emptyForm = {
  name: '',
  phone: '',
  pincode: '',
  city: '',
  state: '',
  houseArea: '',
  area: '',
  landmark: '',
  deliveryInstructions: '',
  isDefault: false,
};

// Builds the editable form shape from a saved Address (whose phone is
// stored E.164, see phoneValidation.js) — used to prefill AddressForm
// when it's rendered in "edit" mode.
function toFormValues(address) {
  if (!address) return emptyForm;
  return {
    name: address.name ?? '',
    phone: fromE164(address.phone),
    pincode: address.pincode ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    houseArea: address.houseArea ?? '',
    area: address.area ?? '',
    landmark: address.landmark ?? '',
    deliveryInstructions: address.deliveryInstructions ?? '',
    isDefault: !!address.isDefault,
  };
}

export default function AddressForm({
  onSubmit,
  onCancel,
  isSubmitting,
  initialValues,
  hideDefaultToggle,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormValues(initialValues));
  const [errors, setErrors] = useState({});
  const isEditing = !!initialValues;
  // Editing an address that's already the default can't un-default it here
  // (see user.service.js#updateAddressById) — the checkbox would be
  // misleading, so it's shown locked-on instead of hidden entirely.
  const isLockedDefault = isEditing && initialValues?.isDefault;

  // Pincode serviceability — purely informational (see shippingService.js
  // and checkout-architecture.md §2): the backend never blocks address
  // creation or draft-order creation on this, so a "not deliverable" or
  // failed check here never disables the Save button, just surfaces a
  // heads-up before the user commits to this address. Same shared hook
  // ProductDetails/ReviewPage use — see useServiceabilityCheck.js.
  const serviceability = useServiceabilityCheck(form.pincode);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = t('checkout.errors.name', 'Enter a valid name.');
    if (!isValidIndianMobile(form.phone)) next.phone = t('checkout.errors.phone', 'Enter a valid 10-digit mobile number.');
    if (!isValidIndianPincode(form.pincode)) next.pincode = t('checkout.errors.pincode', 'Enter a valid 6-digit pincode.');
    if (!form.city.trim()) next.city = t('checkout.errors.city', 'City is required.');
    if (!form.state.trim()) next.state = t('checkout.errors.state', 'State is required.');
    if (!form.houseArea.trim()) next.houseArea = t('checkout.errors.houseArea', 'House / area is required.');
    if (form.area.trim().length < 2) next.area = t('checkout.errors.area', 'Enter a valid area / locality.');
    if (form.deliveryInstructions.length > DELIVERY_INSTRUCTIONS_MAX) {
      next.deliveryInstructions = t(
        'checkout.errors.deliveryInstructions',
        `Keep delivery instructions under ${DELIVERY_INSTRUCTIONS_MAX} characters.`
      );
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: form.name.trim(),
      phone: toE164(form.phone),
      pincode: form.pincode.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      houseArea: form.houseArea.trim(),
      area: form.area.trim(),
      landmark: form.landmark.trim() || undefined,
      deliveryInstructions: form.deliveryInstructions.trim() || undefined,
      isDefault: isLockedDefault ? true : form.isDefault,
    });
  };

  const inputClass = (field) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--clr-primary)] ${
      errors[field] ? 'border-red-400' : 'border-[var(--clr-border)]'
    }`;

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.name', 'Full name')}
          </label>
          <input
            className={inputClass('name')}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            maxLength={80}
            autoComplete="name"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.phone', 'Mobile number')}
          </label>
          <div className={`flex items-center rounded-lg border ${errors.phone ? 'border-red-400' : 'border-[var(--clr-border)]'}`}>
            <span className="pl-3 pr-1 text-sm text-gray-500">+91</span>
            <input
              className="flex-1 rounded-lg px-2 py-2 text-sm focus:outline-none"
              value={form.phone}
              onChange={(e) => setField('phone', sanitizePhoneInput(e.target.value))}
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
            />
          </div>
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          {t('checkout.fields.houseArea', 'House no., building, street')}
        </label>
        <input
          className={inputClass('houseArea')}
          value={form.houseArea}
          onChange={(e) => setField('houseArea', e.target.value)}
          maxLength={200}
          autoComplete="address-line1"
        />
        {errors.houseArea && <p className="text-xs text-red-500 mt-1">{errors.houseArea}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.area', 'Area / locality')}
          </label>
          <input
            className={inputClass('area')}
            value={form.area}
            onChange={(e) => setField('area', e.target.value)}
            maxLength={100}
            placeholder={t('checkout.fields.areaPlaceholder', 'e.g. Kothrud')}
            autoComplete="address-line2"
          />
          {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.landmark', 'Landmark (optional)')}
          </label>
          <input
            className={inputClass('landmark')}
            value={form.landmark}
            onChange={(e) => setField('landmark', e.target.value)}
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.pincode', 'Pincode')}
          </label>
          <input
            className={inputClass('pincode')}
            value={form.pincode}
            onChange={(e) => setField('pincode', sanitizePincodeInput(e.target.value))}
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
          />
          {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
          {!errors.pincode && (
            <ServiceabilityMessage
              status={serviceability.status}
              data={serviceability.data}
              onRetry={serviceability.retry}
              isRetrying={serviceability.status === 'checking'}
              className="mt-1"
            />
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.city', 'City')}
          </label>
          <input
            className={inputClass('city')}
            value={form.city}
            onChange={(e) => setField('city', e.target.value)}
            maxLength={80}
            autoComplete="address-level2"
          />
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.state', 'State')}
          </label>
          <input
            className={inputClass('state')}
            value={form.state}
            onChange={(e) => setField('state', e.target.value)}
            maxLength={80}
            autoComplete="address-level1"
          />
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          {t('checkout.fields.deliveryInstructions', 'Delivery instructions (optional)')}
        </label>
        <textarea
          className={inputClass('deliveryInstructions')}
          value={form.deliveryInstructions}
          onChange={(e) => setField('deliveryInstructions', e.target.value)}
          maxLength={DELIVERY_INSTRUCTIONS_MAX}
          rows={2}
          placeholder={t(
            'checkout.fields.deliveryInstructionsPlaceholder',
            'e.g. Leave with the security guard, call before arriving'
          )}
        />
        <div className="flex items-center justify-between mt-1">
          {errors.deliveryInstructions ? (
            <p className="text-xs text-red-500">{errors.deliveryInstructions}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-400">
            {form.deliveryInstructions.length}/{DELIVERY_INSTRUCTIONS_MAX}
          </p>
        </div>
      </div>

      {!hideDefaultToggle && (
        <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-[var(--clr-border)] text-[var(--clr-primary)] focus:ring-[var(--clr-primary)]"
            checked={isLockedDefault ? true : form.isDefault}
            disabled={isLockedDefault}
            onChange={(e) => setField('isDefault', e.target.checked)}
          />
          {isLockedDefault
            ? t('checkout.isDefaultAddress', 'This is your default address')
            : t('checkout.makeDefaultAddress', 'Set as default address')}
        </label>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary px-6 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? t('checkout.savingAddress', 'Saving…')
            : isEditing
              ? t('checkout.updateAddress', 'Update address')
              : t('checkout.saveAddress', 'Save address')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-outline px-6">
            {t('buttons.cancel', 'Cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

AddressForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  isSubmitting: PropTypes.bool,
  // Pass a saved Address to prefill + switch the form into "edit" mode
  // (label only — onSubmit still receives the same payload shape either
  // way; the caller decides whether that means create or update).
  initialValues: PropTypes.shape({
    name: PropTypes.string,
    phone: PropTypes.string,
    pincode: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    houseArea: PropTypes.string,
    area: PropTypes.string,
    landmark: PropTypes.string,
    deliveryInstructions: PropTypes.string,
    isDefault: PropTypes.bool,
  }),
  // Hide the "set as default" checkbox entirely — used when there are no
  // other addresses yet, so this one becomes the default automatically
  // (see user.service.js#createAddress) and offering a toggle would be
  // misleading busywork.
  hideDefaultToggle: PropTypes.bool,
};

AddressForm.defaultProps = {
  hideDefaultToggle: false,
};
