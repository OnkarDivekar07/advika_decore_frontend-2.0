// src/components/Address/AddressCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiCircle, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AddressCard({ address, isSelected, onSelect, onEdit, onDelete, isDeleting }) {
  const { t } = useTranslation();

  // Edit/delete are plain buttons living inside the outer selectable
  // button — stop propagation so tapping them doesn't also re-select
  // this address as a side effect.
  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(address.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(address.id);
      }}
      aria-pressed={isSelected}
      className={`card w-full text-left p-4 flex items-start gap-3 transition-colors cursor-pointer ${
        isSelected ? 'border-[var(--clr-primary)] ring-1 ring-[var(--clr-primary)]' : ''
      }`}
    >
      {isSelected ? (
        <FiCheckCircle className="w-5 h-5 text-[var(--clr-primary)] shrink-0 mt-0.5" aria-hidden />
      ) : (
        <FiCircle className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{address.name}</p>
        <p className="text-sm text-gray-600">
          {address.houseArea}
          {address.landmark ? `, ${address.landmark}` : ''}
        </p>
        <p className="text-sm text-gray-600">
          {address.city}, {address.state} — {address.pincode}
        </p>
        <p className="text-sm text-gray-500 mt-1">{t('checkout.phone', 'Phone')}: {address.phone}</p>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex flex-col gap-2 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={stop(() => onEdit(address))}
              aria-label={t('checkout.editAddress', 'Edit address')}
              className="p-1.5 rounded-md text-gray-400 hover:text-[var(--clr-primary)] hover:bg-gray-50"
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
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      )}
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
    landmark: PropTypes.string,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isDeleting: PropTypes.bool,
};
