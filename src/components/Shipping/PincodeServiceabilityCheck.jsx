// src/components/Shipping/PincodeServiceabilityCheck.jsx
//
// Self-contained "enter a pincode, see if/when we deliver there" widget —
// pairs a free-typed pincode input with useServiceabilityCheck +
// <ServiceabilityMessage>. Used on the product page today (before an
// address exists to check against); safe to drop in anywhere else a
// standalone pincode check is useful, since it owns its own input state
// rather than assuming a form field already exists (see AddressForm.jsx
// for the pattern that reuses the hook/message directly against a field
// that's already there).
import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { sanitizePincodeInput } from '@/utils/pincodeValidation';
import { useServiceabilityCheck } from '@/features/shipping/hooks/useServiceabilityCheck';
import ServiceabilityMessage from './ServiceabilityMessage';

export default function PincodeServiceabilityCheck({ label, showCodNote, className }) {
  const { t } = useTranslation();
  const [pincode, setPincode] = useState('');
  const { status, data, retry } = useServiceabilityCheck(pincode);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor="pincode-check-input" className="text-sm font-semibold text-gray-700">
        {label ?? t('productDetail.checkDelivery', 'Check delivery date')}
      </label>
      <div className="flex gap-2 max-w-xs">
        <input
          id="pincode-check-input"
          type="text"
          inputMode="numeric"
          value={pincode}
          onChange={(e) => setPincode(sanitizePincodeInput(e.target.value))}
          maxLength={6}
          placeholder={t('productDetail.enterPincode', 'Enter pincode')}
          className="flex-1 min-w-0 rounded-lg border border-[var(--clr-border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--clr-primary)]"
        />
      </div>
      <ServiceabilityMessage
        status={status}
        data={data}
        showCodNote={showCodNote}
        onRetry={retry}
        isRetrying={status === 'checking'}
      />
    </div>
  );
}

PincodeServiceabilityCheck.propTypes = {
  // Override the input's label — defaults to the product-page copy.
  label: PropTypes.string,
  showCodNote: PropTypes.bool,
  className: PropTypes.string,
};

PincodeServiceabilityCheck.defaultProps = {
  label: undefined,
  // Off by default here — no payment mode has been chosen yet at this
  // point in the funnel (product page, pre-cart), so a COD-availability
  // note would be more confusing than useful. AddressForm turns it back
  // on since COD is a real, relevant choice by the address step.
  showCodNote: false,
  className: '',
};
