// src/components/Address/AddressForm.jsx
//
// Form-UX validation only (required fields, pincode/phone shape) — never
// business-rule validation. Whether an address is actually usable for an
// order is the backend's call at draft-order time, same as everywhere else
// in checkout (see checkout-architecture.md §2). Reused as-is by both the
// checkout address step (AddressSelectionPage) and the standalone address
// book (AddressBookPage) — nothing here is checkout-specific.
import React, { useState, useRef } from 'react';
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

// Order fields appear in the form — used to find the *first* invalid one
// (in visual/DOM order) so focus can be moved there on a failed submit,
// rather than leaving a keyboard/screen-reader user to hunt for it.
const FIELD_ORDER = ['name', 'phone', 'houseArea', 'area', 'landmark', 'pincode', 'city', 'state', 'deliveryInstructions'];

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

  // Every field below needs a stable, unique id so its <label> can use
  // htmlFor (screen readers otherwise never learn a field's name — they
  // were purely visual before) and so its error message can be wired up
  // via aria-describedby/aria-invalid. isEditing changes which fields
  // exist (never their identity), so it's safe to bake into the prefix
  // without causing ids to shift under the user while they type.
  const idPrefix = isEditing ? 'addr-edit' : 'addr-new';
  const fieldId = (field) => `${idPrefix}-${field}`;
  const errorId = (field) => `${idPrefix}-${field}-error`;
  const describedBy = (field) => (errors[field] ? errorId(field) : undefined);

  const fieldRefs = useRef({});
  const registerField = (field) => (el) => { fieldRefs.current[field] = el; };

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
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      // Move focus to the first invalid field (in form order) instead of
      // leaving a keyboard/screen-reader user to hunt through the form
      // for whichever fields turned red.
      const firstInvalidField = FIELD_ORDER.find((field) => validationErrors[field]);
      fieldRefs.current[firstInvalidField]?.focus();
      return;
    }
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
          <label htmlFor={fieldId('name')} className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.name', 'Full name')}
          </label>
          <input
            id={fieldId('name')}
            ref={registerField('name')}
            className={inputClass('name')}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            maxLength={80}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy('name')}
          />
          {errors.name && <p id={errorId('name')} role="alert" className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor={fieldId('phone')} className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.phone', 'Mobile number')}
          </label>
          <div className={`flex items-center rounded-lg border ${errors.phone ? 'border-red-400' : 'border-[var(--clr-border)]'}`}>
            <span className="pl-3 pr-1 text-sm text-gray-500" aria-hidden>+91</span>
            <input
              id={fieldId('phone')}
              ref={registerField('phone')}
              className="flex-1 rounded-lg px-2 py-2 text-sm focus:outline-none"
              value={form.phone}
              onChange={(e) => setField('phone', sanitizePhoneInput(e.target.value))}
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
              aria-invalid={!!errors.phone}
              aria-describedby={describedBy('phone')}
            />
          </div>
          {errors.phone && <p id={errorId('phone')} role="alert" className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label htmlFor={fieldId('houseArea')} className="text-sm font-medium text-gray-700 mb-1 block">
          {t('checkout.fields.houseArea', 'House no., building, street')}
        </label>
        <input
          id={fieldId('houseArea')}
          ref={registerField('houseArea')}
          className={inputClass('houseArea')}
          value={form.houseArea}
          onChange={(e) => setField('houseArea', e.target.value)}
          maxLength={200}
          autoComplete="address-line1"
          aria-invalid={!!errors.houseArea}
          aria-describedby={describedBy('houseArea')}
        />
        {errors.houseArea && <p id={errorId('houseArea')} role="alert" className="text-xs text-red-500 mt-1">{errors.houseArea}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={fieldId('area')} className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.area', 'Area / locality')}
          </label>
          <input
            id={fieldId('area')}
            ref={registerField('area')}
            className={inputClass('area')}
            value={form.area}
            onChange={(e) => setField('area', e.target.value)}
            maxLength={100}
            placeholder={t('checkout.fields.areaPlaceholder', 'e.g. Kothrud')}
            autoComplete="address-line2"
            aria-invalid={!!errors.area}
            aria-describedby={describedBy('area')}
          />
          {errors.area && <p id={errorId('area')} role="alert" className="text-xs text-red-500 mt-1">{errors.area}</p>}
        </div>

        <div>
          <label htmlFor={fieldId('landmark')} className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.landmark', 'Landmark (optional)')}
          </label>
          <input
            id={fieldId('landmark')}
            ref={registerField('landmark')}
            className={inputClass('landmark')}
            value={form.landmark}
            onChange={(e) => setField('landmark', e.target.value)}
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor={fieldId('pincode')} className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.pincode', 'Pincode')}
          </label>
          <input
            id={fieldId('pincode')}
            ref={registerField('pincode')}
            className={inputClass('pincode')}
            value={form.pincode}
            onChange={(e) => setField('pincode', sanitizePincodeInput(e.target.value))}
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
            aria-invalid={!!errors.pincode}
            aria-describedby={describedBy('pincode')}
          />
          {errors.pincode && <p id={errorId('pincode')} role="alert" className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
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
          <label htmlFor={fieldId('city')} className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.city', 'City')}
          </label>
          <input
            id={fieldId('city')}
            ref={registerField('city')}
            className={inputClass('city')}
            value={form.city}
            onChange={(e) => setField('city', e.target.value)}
            maxLength={80}
            autoComplete="address-level2"
            aria-invalid={!!errors.city}
            aria-describedby={describedBy('city')}
          />
          {errors.city && <p id={errorId('city')} role="alert" className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label htmlFor={fieldId('state')} className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.state', 'State')}
          </label>
          <input
            id={fieldId('state')}
            ref={registerField('state')}
            className={inputClass('state')}
            value={form.state}
            onChange={(e) => setField('state', e.target.value)}
            maxLength={80}
            autoComplete="address-level1"
            aria-invalid={!!errors.state}
            aria-describedby={describedBy('state')}
          />
          {errors.state && <p id={errorId('state')} role="alert" className="text-xs text-red-500 mt-1">{errors.state}</p>}
        </div>
      </div>

      <div>
        <label htmlFor={fieldId('deliveryInstructions')} className="text-sm font-medium text-gray-700 mb-1 block">
          {t('checkout.fields.deliveryInstructions', 'Delivery instructions (optional)')}
        </label>
        <textarea
          id={fieldId('deliveryInstructions')}
          ref={registerField('deliveryInstructions')}
          className={inputClass('deliveryInstructions')}
          value={form.deliveryInstructions}
          onChange={(e) => setField('deliveryInstructions', e.target.value)}
          maxLength={DELIVERY_INSTRUCTIONS_MAX}
          rows={2}
          placeholder={t(
            'checkout.fields.deliveryInstructionsPlaceholder',
            'e.g. Leave with the security guard, call before arriving'
          )}
          aria-invalid={!!errors.deliveryInstructions}
          aria-describedby={
            [errors.deliveryInstructions ? errorId('deliveryInstructions') : null, `${fieldId('deliveryInstructions')}-count`]
              .filter(Boolean)
              .join(' ')
          }
        />
        <div className="flex items-center justify-between mt-1">
          {errors.deliveryInstructions ? (
            <p id={errorId('deliveryInstructions')} role="alert" className="text-xs text-red-500">{errors.deliveryInstructions}</p>
          ) : (
            <span />
          )}
          <p id={`${fieldId('deliveryInstructions')}-count`} className="text-xs text-gray-500">
            {form.deliveryInstructions.length}/{DELIVERY_INSTRUCTIONS_MAX}
          </p>
        </div>
      </div>

      {!hideDefaultToggle && (
        <label htmlFor={fieldId('isDefault')} className="flex items-center gap-2 text-sm text-gray-700 select-none">
          <input
            id={fieldId('isDefault')}
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
