// src/components/Product/FilterDrawer.jsx
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import ProductFilters from './ProductFilters';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function FilterDrawer({ open, onClose, resultCount, ...filterProps }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Lock background scroll while the drawer is open, and let Escape close it.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Basic focus trap: keep Tab/Shift+Tab cycling within the dialog
      // instead of leaking focus out to the (visually hidden, but still
      // reachable) page content behind it.
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  // Move focus into the dialog on open (to its close button, a stable
  // and always-present target), and restore it to whatever triggered
  // the drawer once it closes — so keyboard/screen-reader users aren't
  // dropped back at the top of the page.
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement;
      // Deferred one tick so the sheet has mounted before we try to focus it.
      const id = requestAnimationFrame(() => closeButtonRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    if (previouslyFocusedRef.current instanceof HTMLElement) {
      previouslyFocusedRef.current.focus();
    }
    previouslyFocusedRef.current = null;
    return undefined;
  }, [open]);

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

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="btn btn-primary w-full">
            {t('products.showResults', 'Show results')}
            {typeof resultCount === 'number' ? ` (${resultCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
