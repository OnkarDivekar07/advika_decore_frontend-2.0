// src/hooks/useModalA11y.js
//
// Shared accessibility behaviour for anything rendered as a modal/dialog
// overlay (drawers, popovers, the mobile nav panel, etc.): traps Tab/
// Shift+Tab inside the dialog, closes on Escape, moves focus into the
// dialog when it opens, and restores focus to whatever triggered it when
// it closes. Extracted from FilterDrawer's original implementation so
// every dialog in the app gets the same, single-source-of-truth behaviour
// instead of each one reimplementing (or forgetting to implement) it.
import { useEffect, useRef } from 'react';

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose?: () => void,        // omit for a dialog with no dismiss action (e.g. a forced first-run choice)
 *   initialFocusRef?: { current: HTMLElement | null }, // defaults to the first focusable element in the dialog
 *   lockScroll?: boolean,        // default true
 * }} options
 * @returns {{ current: HTMLElement | null }} ref to attach to the dialog's root element
 */
export default function useModalA11y({ isOpen, onClose, initialFocusRef, lockScroll = true }) {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Escape-to-close + Tab focus trap.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
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
      if (lockScroll) document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, lockScroll]);

  // Move focus into the dialog on open, restore it to the trigger on close.
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
      const id = requestAnimationFrame(() => {
        const target = initialFocusRef?.current || dialogRef.current?.querySelector(FOCUSABLE_SELECTOR);
        target?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    if (previouslyFocusedRef.current instanceof HTMLElement) {
      previouslyFocusedRef.current.focus();
    }
    previouslyFocusedRef.current = null;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return dialogRef;
}
