// src/features/address/hooks/useAddressBook.js
//
// Plain CRUD + default-selection state for a user's saved addresses, with
// no checkout/draft-order concerns attached — CheckoutContext has its own
// address handlers because it also has to keep a draft order in sync with
// whichever address is *selected for an order* (see CheckoutContext.jsx).
// This hook is for anywhere else addresses need managing on their own,
// e.g. AddressBookPage (account settings).
import { useCallback, useEffect, useState } from 'react';
import * as addressService from '@/services/addressService';
import { handleError } from '@/utils/errorHandler';

export function useAddressBook({ autoLoad = true } = {}) {
  const [addresses, setAddresses] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle'|'loading'|'ready'|'error'
  const [mutatingId, setMutatingId] = useState(null); // address id currently being deleted/defaulted
  const [isSaving, setIsSaving] = useState(false); // create/edit in flight

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const list = await addressService.getAddresses();
      setAddresses(list);
      setStatus('ready');
      return list;
    } catch (error) {
      setStatus('error');
      handleError(error, "Couldn't load your saved addresses.");
      return [];
    }
  }, []);

  useEffect(() => {
    if (autoLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  const addAddress = useCallback(async (payload) => {
    setIsSaving(true);
    try {
      const created = await addressService.createAddress(payload);
      // A newly-default address (first one, or isDefault: true) means the
      // backend has already cleared everyone else's flag — reflect that
      // locally rather than doing a second round trip just to re-sync it.
      setAddresses((prev) =>
        created.isDefault
          ? [...prev.map((a) => ({ ...a, isDefault: false })), created]
          : [...prev, created]
      );
      return created;
    } catch (error) {
      handleError(error, "Couldn't save that address. Please check the details and try again.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const editAddress = useCallback(async (id, payload) => {
    setIsSaving(true);
    try {
      const updated = await addressService.updateAddress(id, payload);
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === id) return updated;
          // Mirror the same "only one default" invariant the backend
          // enforces, in case this edit made `updated` the new default.
          return updated.isDefault ? { ...a, isDefault: false } : a;
        })
      );
      return updated;
    } catch (error) {
      handleError(error, "Couldn't update that address. Please check the details and try again.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const removeAddress = useCallback(async (id) => {
    setMutatingId(id);
    try {
      await addressService.deleteAddress(id);
      // If the deleted address was the default, the backend promotes the
      // next most-recent one (see user.service.js#deleteAddressById) — the
      // simplest way to reflect that correctly here is a fresh fetch
      // rather than guessing which one it picked.
      const wasDefault = addresses.find((a) => a.id === id)?.isDefault;
      if (wasDefault) {
        await load();
      } else {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      handleError(error, "Couldn't remove that address. Please try again.");
      throw error;
    } finally {
      setMutatingId(null);
    }
  }, [addresses, load]);

  const setDefaultAddress = useCallback(async (id) => {
    setMutatingId(id);
    try {
      await addressService.setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (error) {
      handleError(error, "Couldn't set that as your default address. Please try again.");
      throw error;
    } finally {
      setMutatingId(null);
    }
  }, []);

  return {
    addresses,
    status,
    load,
    addAddress,
    editAddress,
    removeAddress,
    setDefaultAddress,
    isSaving,
    mutatingId,
  };
}
