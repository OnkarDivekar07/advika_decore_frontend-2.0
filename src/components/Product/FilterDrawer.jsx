// src/components/Product/FilterDrawer.jsx
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import ProductFilters from './ProductFilters';
import useModalA11y from '@/hooks/useModalA11y';

export default function FilterDrawer({ open, onClose, resultCount, ...filterProps }) {
  const { t } = useTranslation();
  const closeButtonRef = useRef(null);

  // Focus trap, Escape-to-close, background scroll lock, and focus
  // move-in/restore-on-close — shared with every other dialog in the app,
  // see useModalA11y. Initial focus goes to the close button, a stable
  // and always-present target.
  const dialogRef = useModalA11y({ isOpen: open, onClose, initialFocusRef: closeButtonRef });

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('products.filters', 'Filters')}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-up" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{t('products.filters', 'Filters')}</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={t('products.close', 'Close')}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 flex-1">
          <ProductFilters {...filterProps} />
        </div>

        {/* pb-safe: this bar sits right at the bottom edge of the sheet,
            which itself pins to the bottom of the viewport — without it
            the button sits under a phone's home-indicator/gesture area on
            devices with a safe-area inset, same as every other
            bottom-pinned CTA bar in checkout (AddressSelectionPage,
            ReviewPage, PaymentPage, ProductDetails). */}
        <div className="px-5 py-4 pb-safe border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="btn btn-primary w-full">
            {t('products.showResults', 'Show results')}
            {typeof resultCount === 'number' ? ` (${resultCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
