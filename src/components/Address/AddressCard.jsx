// src/components/Address/AddressCard.jsx
//
// Reusable read-only address card — used identically by the checkout
// address step (AddressSelectionPage) and the standalone address book
// (AddressBookPage). Selection (onSelect) is optional: the address book
// doesn't need a "pick this one for this order" affordance, only edit /
// delete / set-default.
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiCircle, FiEdit2, FiTrash2, FiStar } from 'react-icons/fi';
import { fromE164 } from '@/utils/phoneValidation';

export default function AddressCard({
  address,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
  isSettingDefault,
}) {
  const { t } = useTranslation();
  const selectable = !!onSelect;

  // Edit/delete/set-default are plain buttons living inside the outer
  // selectable button — stop propagation so tapping them doesn't also
  // re-select this address as a side effect.
  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  const body = (
    <>
      {selectable &&
        (isSelected ? (
          <FiCheckCircle className="w-5 h-5 text-advika-orange shrink-0 mt-0.5" aria-hidden />
        ) : (
          <FiCircle className="w-5 h-5 text-advika-grey400 shrink-0 mt-0.5" aria-hidden />
        ))}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-advika-chrome">{address.name}</p>
          {address.isDefault && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-advika-orange-darker bg-advika-orange-tint border border-advika-orange-border rounded px-2 py-0.5">
              <FiStar className="w-3 h-3" aria-hidden />
              {t('checkout.defaultAddress', 'Default')}
            </span>
          )}
        </div>
        <p className="text-sm text-advika-grey800">
          {address.houseArea}
          {address.area ? `, ${address.area}` : ''}
          {address.landmark ? `, ${address.landmark}` : ''}
        </p>
        <p className="text-sm text-advika-grey800">
          {address.city}, {address.state} — {address.pincode}
        </p>
        <p className="text-sm text-advika-grey700 mt-1 aa-mono">
          {t('checkout.phone', 'Phone')}: +91 {fromE164(address.phone)}
        </p>
        {address.deliveryInstructions && (
          <p className="text-xs text-advika-grey700 mt-1 italic">
            {t('checkout.deliveryNote', 'Note')}: {address.deliveryInstructions}
          </p>
        )}
        {!address.isDefault && onSetDefault && (
          <button
            type="button"
            onClick={stop(() => onSetDefault(address.id))}
            disabled={isSettingDefault}
            data-testid={`address-card-set-default-${address.id}`}
            className="text-xs font-medium text-advika-orange-dark hover:underline mt-1.5 disabled:opacity-50 disabled:no-underline"
          >
            {isSettingDefault
              ? t('checkout.settingDefault', 'Setting as default…')
              : t('checkout.setAsDefault', 'Set as default')}
          </button>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div className="flex flex-col gap-2 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={stop(() => onEdit(address))}
              aria-label={t('checkout.editAddress', 'Edit address')}
              data-testid={`address-card-edit-${address.id}`}
              className="p-1.5 rounded-md text-advika-grey650 hover:text-advika-orange hover:bg-advika-off-white"
            >
              <FiEdit2 className="w-4 h-4" aria-hidden />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={stop(() => onDelete(address.id))}
              disabled={isDeleting}
              aria-label={t('checkout.deleteAddress', 'Delete address')}
              data-testid={`address-card-delete-${address.id}`}
              className="p-1.5 rounded-md text-advika-grey650 hover:text-red-500 hover:bg-advika-off-white disabled:opacity-50"
            >
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </>
  );

  const className = `w-full text-left p-4 flex items-start gap-3 transition-colors bg-white border ${
    selectable ? 'cursor-pointer' : ''
  } ${isSelected ? 'border-[1.5px] border-advika-orange' : 'border-advika-border-light'}`;

  if (!selectable) {
    return <div className={className} data-testid={`address-card-${address.id}`}>{body}</div>;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`address-card-select-${address.id}`}
      onClick={() => onSelect(address.id)}
      onKeyDown={(e) => {
        // A custom role="button" div doesn't get the browser's built-in
        // "Space doesn't scroll the page" behaviour real <button>
        // elements have, so without preventDefault, pressing Space here
        // both selects the address *and* scrolls the page — a real
        // keyboard-accessibility bug (WCAG 2.1.1), not just a nicety.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(address.id);
        }
      }}
      aria-pressed={isSelected}
      className={className}
    >
      {body}
    </div>
  );
}

AddressCard.propTypes = {
  address: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    phone: PropTypes.string.isRequired,
    pincode: PropTypes.string.isRequired,
    city: PropTypes.string.isRequired,
    state: PropTypes.string.isRequired,
    houseArea: PropTypes.string.isRequired,
    area: PropTypes.string,
    landmark: PropTypes.string,
    deliveryInstructions: PropTypes.string,
    isDefault: PropTypes.bool,
  }).isRequired,
  // Selection is optional — omit onSelect to render a plain (non-radio)
  // card, used by the standalone address book where there's nothing to
  // "select" for an order.
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSetDefault: PropTypes.func,
  isDeleting: PropTypes.bool,
  isSettingDefault: PropTypes.bool,
};

AddressCard.defaultProps = {
  isSelected: false,
};
