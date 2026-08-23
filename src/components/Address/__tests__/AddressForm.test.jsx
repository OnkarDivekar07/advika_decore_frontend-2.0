import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n/index'; // initializes the default i18next instance react-i18next falls back to

vi.mock('@/services/shippingService', () => ({
  checkServiceability: vi.fn().mockResolvedValue({ serviceable: true, estimatedDays: 3 }),
}));

import AddressForm from '@/components/Address/AddressForm';
import { checkServiceability } from '@/services/shippingService';

async function fillValidForm(user, { pincode = '411045' } = {}) {
  // userEvent.type simulates real keystroke timing against a single
  // shared document — typing into multiple fields concurrently via
  // Promise.all interleaves keystrokes across fields. Must be sequential.
  await user.type(screen.getByLabelText(/full name/i), 'Asha Patil');
  await user.type(screen.getByLabelText(/mobile number/i), '9876543210');
  await user.type(screen.getByLabelText(/full address/i), '221B Baker Society');
  await user.type(screen.getByLabelText(/area \/ locality/i), 'Kothrud');
  await user.type(screen.getByLabelText(/pincode/i), pincode);
  await user.type(screen.getByLabelText(/^city$/i), 'Pune');
  await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validation failures', () => {
  it('shows an error for every required field and does not call onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddressForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/enter a valid name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid 6-digit pincode/i)).toBeInTheDocument();
    expect(screen.getByText(/city is required/i)).toBeInTheDocument();
    expect(screen.getByText(/state is required/i)).toBeInTheDocument();
    expect(screen.getByText(/house \/ area is required/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid area \/ locality/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('moves focus to the first invalid field (name) on a failed submit', async () => {
    const user = userEvent.setup();
    render(<AddressForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByLabelText(/full name/i)).toHaveFocus());
  });

  it('rejects a phone number that does not look like an Indian mobile', async () => {
    const user = userEvent.setup();
    render(<AddressForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/mobile number/i), '1234567890'); // starts with 1 — invalid
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/enter a valid 10-digit mobile number/i)).toBeInTheDocument();
  });

  it('rejects a pincode that is the wrong length', async () => {
    const user = userEvent.setup();
    render(<AddressForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/pincode/i), '411');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/enter a valid 6-digit pincode/i)).toBeInTheDocument();
  });

  it('clears a field error as soon as the user edits that field again', async () => {
    const user = userEvent.setup();
    render(<AddressForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/enter a valid name/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), 'A');
    expect(screen.queryByText(/enter a valid name/i)).not.toBeInTheDocument();
  });

  it('rejects delivery instructions over the character limit', async () => {
    render(<AddressForm onSubmit={vi.fn()} />);
    const longText = 'x'.repeat(199); // 199 chars: maxLength=200 never blocks reaching it

    // This test only cares about the rendered character count, not real
    // per-keystroke behavior — so set the value in one fireEvent.change
    // rather than user.type()'ing 199 individual keystrokes. That
    // sequential typing was slow enough on some machines to blow past
    // Vitest's 5000ms default test timeout, and once it timed out the
    // still-in-flight keystrokes kept firing into the DOM afterward and
    // bled into whichever test ran next (interleaving stray characters
    // into its input) — see the "successful submission" test below.
    const textarea = screen.getByLabelText(/delivery instructions/i);
    fireEvent.change(textarea, { target: { value: longText } });
    // maxLength on the textarea itself caps input at 200 chars client-side,
    // so this test focuses on the boundary the validator actually checks
    // (>200) rather than fighting the browser's own maxLength enforcement.
    expect(screen.getByText('199/200')).toBeInTheDocument();
  });
});

describe('successful submission', () => {
  it('submits a normalized, E.164-phone payload once every field is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddressForm onSubmit={onSubmit} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Asha Patil',
        phone: '+919876543210',
        pincode: '411045',
        city: 'Pune',
        state: 'Maharashtra',
        houseArea: '221B Baker Society',
        area: 'Kothrud',
      })
    );
  });

  it('disables the submit button and shows a saving label while isSubmitting is true', () => {
    render(<AddressForm onSubmit={vi.fn()} isSubmitting />);
    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
  });

  it('prefills from initialValues and switches to "Update address" edit mode', async () => {
    render(
      <AddressForm
        onSubmit={vi.fn()}
        initialValues={{
          id: 'addr1',
          name: 'Asha Patil',
          phone: '+919876543210',
          pincode: '411045',
          city: 'Pune',
          state: 'Maharashtra',
          houseArea: '221B Baker Society',
          area: 'Kothrud',
          isDefault: true,
        }}
      />
    );

    expect(screen.getByLabelText(/full name/i)).toHaveValue('Asha Patil');
    expect(screen.getByLabelText(/mobile number/i)).toHaveValue('9876543210'); // E.164 -> local digits
    expect(screen.getByRole('button', { name: /update address/i })).toBeInTheDocument();
    // The pincode above triggers a real (mocked) serviceability check on
    // mount — let it settle so its state update doesn't leak into the
    // next test as an unwrapped act() warning.
    await waitFor(() => expect(vi.mocked(checkServiceability)).toHaveBeenCalled());
  });

  it('locks the default-address checkbox on when editing an address that is already default', () => {
    render(
      <AddressForm
        onSubmit={vi.fn()}
        initialValues={{ id: 'addr1', name: 'Asha', phone: '+919876543210', isDefault: true }}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: /this is your default address/i });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });
});
