// src/components/Address/AddressForm.jsx
//
// Form-UX validation only (required fields, pincode/phone shape) — never
// business-rule validation. Whether an address is actually usable for an
// order is the backend's call at draft-order time, same as everywhere else
// in checkout (see checkout-architecture.md §2).
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import {
  sanitizePhoneInput,
  isValidIndianMobile,
  toE164,
  fromE164,
} from '@/utils/phoneValidation';
import { useDebouncedValue } from '@/features/products/hooks/useDebouncedValue';
import * as shippingService from '@/services/shippingService';

const PINCODE_REGEX = /^\d{6}$/;

const emptyForm = {
  name: '',
  phone: '',
  pincode: '',
  city: '',
  state: '',
  houseArea: '',
  landmark: '',
};

// Builds the editable form shape from a saved Address (whose phone is
// stored E.164, see phoneValidation.js) — used to prefill AddressForm
// when it's rendered in "edit" mode from AddressSelectionPage.
function toFormValues(address) {
  if (!address) return emptyForm;
  return {
    name: address.name ?? '',
    phone: fromE164(address.phone),
    pincode: address.pincode ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    houseArea: address.houseArea ?? '',
    landmark: address.landmark ?? '',
  };
}

export default function AddressForm({ onSubmit, onCancel, isSubmitting, initialValues }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormValues(initialValues));
  const [errors, setErrors] = useState({});
  const isEditing = !!initialValues;

  // Pincode serviceability — purely informational (see shippingService.js
  // and checkout-architecture.md §2): the backend never blocks address
  // creation or draft-order creation on this, so a "not deliverable" or
  // failed check here never disables the Save button, just surfaces a
  // heads-up before the user commits to this address.
  const [serviceability, setServiceability] = useState({ status: 'idle', data: null });
  const debouncedPincode = useDebouncedValue(form.pincode, 500);

  useEffect(() => {
    if (!PINCODE_REGEX.test(debouncedPincode)) {
      setServiceability({ status: 'idle', data: null });
      return;
    }
    let cancelled = false;
    setServiceability({ status: 'checking', data: null });
    shippingService
      .checkServiceability({ pincode: debouncedPincode })
      .then((data) => {
        if (!cancelled) setServiceability({ status: 'ready', data });
      })
      .catch(() => {
        // Non-critical — the user can still save the address and this
        // gets re-validated for real at draft-order/shipping time.
        if (!cancelled) setServiceability({ status: 'error', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPincode]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = t('checkout.errors.name', 'Enter a valid name.');
    if (!isValidIndianMobile(form.phone)) next.phone = t('checkout.errors.phone', 'Enter a valid 10-digit mobile number.');
    if (!PINCODE_REGEX.test(form.pincode)) next.pincode = t('checkout.errors.pincode', 'Enter a valid 6-digit pincode.');
    if (!form.city.trim()) next.city = t('checkout.errors.city', 'City is required.');
    if (!form.state.trim()) next.state = t('checkout.errors.state', 'State is required.');
    if (!form.houseArea.trim()) next.houseArea = t('checkout.errors.houseArea', 'House / area is required.');
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
      landmark: form.landmark.trim() || undefined,
    });
  };

  const inputClass = (field) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--clr-primary)] ${
      errors[field] ? 'border-red-400' : 'border-[var(--clr-border)]'
    }`;

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4">
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
            />
          </div>
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          {t('checkout.fields.houseArea', 'House no., building, street, area')}
        </label>
        <input
          className={inputClass('houseArea')}
          value={form.houseArea}
          onChange={(e) => setField('houseArea', e.target.value)}
          maxLength={200}
        />
        {errors.houseArea && <p className="text-xs text-red-500 mt-1">{errors.houseArea}</p>}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {t('checkout.fields.pincode', 'Pincode')}
          </label>
          <input
            className={inputClass('pincode')}
            value={form.pincode}
            onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
          />
          {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
          {!errors.pincode && serviceability.status === 'checking' && (
            <p className="text-xs text-gray-400 mt-1">
              {t('checkout.checkingServiceability', 'Checking delivery availability…')}
            </p>
          )}
          {!errors.pincode && serviceability.status === 'ready' && serviceability.data.serviceable && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <FiCheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {serviceability.data.estimatedDays
                ? t('checkout.deliversIn', 'Delivers in ~{{days}} days', {
                    days: serviceability.data.estimatedDays,
                  })
                : t('checkout.deliverable', 'We deliver to this pincode')}
              {serviceability.data.codAvailable === false &&
                ` — ${t('checkout.codUnavailable', 'Cash on delivery not available here')}`}
            </p>
          )}
          {!errors.pincode && serviceability.status === 'ready' && !serviceability.data.serviceable && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {t('checkout.notServiceable', "We don't deliver to this pincode yet")}
            </p>
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
          />
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
        </div>
      </div>

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
    landmark: PropTypes.string,
  }),
};
