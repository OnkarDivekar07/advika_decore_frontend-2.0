// src/hooks/__tests__/useModalA11y.test.jsx
//
// Pattern 21 (mobile/responsive/accessibility smoke): useModalA11y backs
// every real dialog in the app (PhoneOtpModal, LanguageModal, Navbar's
// mobile menu, LanguageSelectorModal) but had no test of its own — a
// regression here would silently break Tab-trapping/Escape/focus-restore
// for all of them at once. Tests the hook through a small real component
// (not renderHook in isolation) so the keydown listeners and DOM focus
// calls it makes have real elements to act on.
//
// The dialog component stays mounted throughout, with `isOpen` toggling as
// a prop — matching how every real consumer actually uses this hook (e.g.
// AuthGateContext's `<PhoneOtpModal isOpen={isOpen} onClose={...} />`,
// never conditionally mounted/unmounted by its parent). The hook's own
// restore-on-close effect only runs on an isOpen prop *transition*, not on
// unmount, so a test harness that conditionally unmounts the dialog
// instead of toggling isOpen would exercise a usage pattern nothing in the
// real app actually relies on.
import React, { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useModalA11y from '../useModalA11y';

function TestDialog({ isOpen, onClose }) {
  const dialogRef = useModalA11y({ isOpen, onClose });
  return (
    <div ref={dialogRef} role="dialog" data-testid="dialog" hidden={!isOpen}>
      <button data-testid="first">First</button>
      <button data-testid="middle">Middle</button>
      <button data-testid="last">Last</button>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>
        Open
      </button>
      <TestDialog isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

describe('useModalA11y', () => {
  it('moves focus into the dialog when it opens', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => expect(screen.getByTestId('first')).toHaveFocus());
  });

  it('restores focus to the trigger element when the dialog closes', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('trigger'));
    await waitFor(() => expect(screen.getByTestId('first')).toHaveFocus());

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.getByTestId('trigger')).toHaveFocus());
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(<TestDialog isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab from the last focusable element back to the first (forward trap)', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('trigger'));
    await waitFor(() => expect(screen.getByTestId('first')).toHaveFocus());

    screen.getByTestId('last').focus();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable element to the last (backward trap)', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('trigger'));
    await waitFor(() => expect(screen.getByTestId('first')).toHaveFocus());

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(screen.getByTestId('last')).toHaveFocus();
  });

  it('does nothing when the dialog is closed (no listener leak onto the rest of the page)', async () => {
    const onClose = vi.fn();
    render(<TestDialog isOpen={false} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
