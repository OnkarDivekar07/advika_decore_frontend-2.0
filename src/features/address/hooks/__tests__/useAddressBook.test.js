import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/services/addressService', () => ({
  getAddresses: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
}));
vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn(),
}));

import * as addressService from '@/services/addressService';
import { handleError } from '@/utils/errorHandler';
import { useAddressBook } from '@/features/address/hooks/useAddressBook';

const addr = (overrides = {}) => ({
  id: 'a1',
  name: 'Home',
  isDefault: false,
  city: 'Pune',
  ...overrides,
});

beforeEach(() => {
  Object.values(addressService).forEach((fn) => fn.mockReset?.());
  handleError.mockReset();
});

describe('auto-loading on mount', () => {
  it('loads addresses by default', async () => {
    addressService.getAddresses.mockResolvedValue([addr()]);
    const { result } = renderHook(() => useAddressBook());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.addresses).toEqual([addr()]);
  });

  it('does not auto-load when autoLoad is false', () => {
    renderHook(() => useAddressBook({ autoLoad: false }));
    expect(addressService.getAddresses).not.toHaveBeenCalled();
  });

  it('sets an error status and reports the failure if loading fails', async () => {
    const error = new Error('down');
    addressService.getAddresses.mockRejectedValue(error);
    const { result } = renderHook(() => useAddressBook());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.addresses).toEqual([]);
    expect(handleError).toHaveBeenCalledWith(error, "Couldn't load your saved addresses.");
  });
});

describe('addAddress', () => {
  it('appends a non-default new address', async () => {
    addressService.getAddresses.mockResolvedValue([]);
    const created = addr({ id: 'a2', isDefault: false });
    addressService.createAddress.mockResolvedValue(created);
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.addAddress({ name: 'Office' });
    });
    expect(result.current.addresses).toContainEqual(created);
  });

  it('clears every other address default flag when the new one is default', async () => {
    addressService.getAddresses.mockResolvedValue([addr({ id: 'a1', isDefault: true })]);
    const created = addr({ id: 'a2', isDefault: true });
    addressService.createAddress.mockResolvedValue(created);
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.addAddress({ name: 'Office', isDefault: true });
    });

    const oldOne = result.current.addresses.find((a) => a.id === 'a1');
    expect(oldOne.isDefault).toBe(false);
  });

  it('rethrows and reports on failure, leaving the list unchanged', async () => {
    addressService.getAddresses.mockResolvedValue([addr()]);
    const error = { response: { status: 422 } };
    addressService.createAddress.mockRejectedValue(error);
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await expect(
      act(async () => {
        await result.current.addAddress({ name: '' });
      })
    ).rejects.toBeDefined();
    expect(result.current.addresses).toHaveLength(1);
    expect(handleError).toHaveBeenCalled();
  });
});

describe('editAddress', () => {
  it('replaces the edited address in place', async () => {
    addressService.getAddresses.mockResolvedValue([addr({ id: 'a1', name: 'Home' })]);
    const updated = addr({ id: 'a1', name: 'Home (updated)' });
    addressService.updateAddress.mockResolvedValue(updated);
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.editAddress('a1', { name: 'Home (updated)' });
    });
    expect(result.current.addresses[0].name).toBe('Home (updated)');
  });

  it('un-defaults every other address if this edit made it the new default', async () => {
    addressService.getAddresses.mockResolvedValue([
      addr({ id: 'a1', isDefault: true }),
      addr({ id: 'a2', isDefault: false }),
    ]);
    addressService.updateAddress.mockResolvedValue(addr({ id: 'a2', isDefault: true }));
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.editAddress('a2', { isDefault: true });
    });

    expect(result.current.addresses.find((a) => a.id === 'a1').isDefault).toBe(false);
    expect(result.current.addresses.find((a) => a.id === 'a2').isDefault).toBe(true);
  });
});

describe('removeAddress', () => {
  it('removes a non-default address without a re-fetch', async () => {
    addressService.getAddresses.mockResolvedValue([
      addr({ id: 'a1', isDefault: false }),
      addr({ id: 'a2', isDefault: true }),
    ]);
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.removeAddress('a1');
    });
    expect(result.current.addresses.map((a) => a.id)).toEqual(['a2']);
    expect(addressService.getAddresses).toHaveBeenCalledTimes(1); // only the initial load
  });

  it('re-fetches the list when the default address was removed (backend promotes a new default)', async () => {
    addressService.getAddresses
      .mockResolvedValueOnce([addr({ id: 'a1', isDefault: true }), addr({ id: 'a2' })])
      .mockResolvedValueOnce([addr({ id: 'a2', isDefault: true })]);
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.removeAddress('a1');
    });
    expect(addressService.getAddresses).toHaveBeenCalledTimes(2);
    expect(result.current.addresses).toEqual([addr({ id: 'a2', isDefault: true })]);
  });

  it('tracks mutatingId while the delete is in flight and clears it after', async () => {
    addressService.getAddresses.mockResolvedValue([addr({ id: 'a1', isDefault: false })]);
    let resolveDelete;
    addressService.deleteAddress.mockImplementation(
      () => new Promise((resolve) => { resolveDelete = resolve; })
    );
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let removePromise;
    act(() => {
      removePromise = result.current.removeAddress('a1');
    });
    expect(result.current.mutatingId).toBe('a1');

    await act(async () => {
      resolveDelete();
      await removePromise;
    });
    expect(result.current.mutatingId).toBeNull();
  });
});

describe('setDefaultAddress', () => {
  it('marks exactly one address as default', async () => {
    addressService.getAddresses.mockResolvedValue([
      addr({ id: 'a1', isDefault: true }),
      addr({ id: 'a2', isDefault: false }),
    ]);
    addressService.setDefaultAddress.mockResolvedValue({});
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.setDefaultAddress('a2');
    });
    expect(result.current.addresses.find((a) => a.id === 'a1').isDefault).toBe(false);
    expect(result.current.addresses.find((a) => a.id === 'a2').isDefault).toBe(true);
  });

  it('reports and rethrows on failure', async () => {
    addressService.getAddresses.mockResolvedValue([addr()]);
    const error = new Error('down');
    addressService.setDefaultAddress.mockRejectedValue(error);
    const { result } = renderHook(() => useAddressBook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await expect(
      act(async () => {
        await result.current.setDefaultAddress('a1');
      })
    ).rejects.toBe(error);
    expect(handleError).toHaveBeenCalled();
  });
});
