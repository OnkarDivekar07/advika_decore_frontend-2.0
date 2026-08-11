// src/pages/AddressSelection/AddressSelectionPage.jsx
//
// /checkout (index route under CheckoutLayout — see AppRoutes.jsx). Loads
// the user's saved addresses, lets them pick or add one, and on "Continue"
// creates/refreshes the draft order for that address before moving to the
// payment step (checkout-architecture.md §3.2 steps 1-2).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiPlus } from 'react-icons/fi';
import Spinner from '@/components/Shared/Spinner';
import AddressCard from '@/components/Address/AddressCard';
import AddressForm from '@/components/Address/AddressForm';
import { useCheckout } from '@/contexts/CheckoutContext';
import { handleError } from '@/utils/errorHandler';

export default function AddressSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    addresses,
    addressesStatus,
    loadAddresses,
    selectedAddressId,
    selectAddress,
    addAddress,
    editAddress,
    removeAddress,
    draftStatus,
    isRestoring,
    goToStep,
  } = useCheckout();

  const [showForm, setShowForm] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null); // the Address object being edited, or null
  const [deletingId, setDeletingId] = useState(null);

  // Keeps the persisted "current step" hint (see checkoutStorage.js) in
  // sync whenever this step is actually the one on screen — covers
  // browser back/forward as well as the normal forward flow.
  useEffect(() => {
    goToStep('address');
  }, [goToStep]);

  useEffect(() => {
    // If CheckoutContext is (re)validating a selection restored from a
    // previous visit (see checkoutStorage.js), it already loads the
    // address list itself as part of that — skip the redundant fetch here
    // rather than firing a second one the moment restore finishes.
    if (isRestoring || addressesStatus !== 'idle') return;
    loadAddresses();
  }, [isRestoring, addressesStatus, loadAddresses]);

  // Once the list is in, either default to the most recently added
  // address (this also kicks off the first draft-order creation, so
  // Review & Payment has something to show without an extra click) or,
  // if there's nothing on file yet, jump straight to the add-address form.
  const defaultedRef = React.useRef(false);
  useEffect(() => {
    // While CheckoutContext is still restoring a selection from a previous
    // visit, let it finish (and pick that selection) before this ever
    // considers defaulting to something else — otherwise the two race to
    // decide `selectedAddressId` and can both fire their own
    // refreshDraftOrder call for different addresses.
    if (isRestoring || addressesStatus !== 'ready' || defaultedRef.current) return;
    defaultedRef.current = true;
    if (addresses.length === 0) {
      setShowForm(true);
    } else if (!selectedAddressId) {
      selectAddress(addresses[addresses.length - 1].id);
    }
  }, [isRestoring, addressesStatus, addresses, selectedAddressId, selectAddress]);

  const handleAddAddress = async (payload) => {
    setIsAddingAddress(true);
    try {
      await addAddress(payload);
      setShowForm(false);
    } catch (error) {
      // If createAddress itself failed (e.g. backend validation), nothing
      // downstream (selectAddress/refreshDraftOrder) ever ran to surface
      // its own toast — so this is the one place that needs to.
      handleError(error, "Couldn't save that address. Please check the details and try again.");
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleEditAddress = async (payload) => {
    setIsAddingAddress(true);
    try {
      await editAddress(editingAddress.id, payload);
      setEditingAddress(null);
    } catch (error) {
      handleError(error, "Couldn't update that address. Please check the details and try again.");
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm(t('checkout.confirmDeleteAddress', 'Remove this address?'))) return;
    setDeletingId(id);
    try {
      await removeAddress(id);
    } catch (error) {
      handleError(error, "Couldn't remove that address. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleContinue = async () => {
    if (!selectedAddressId) return;
    setIsContinuing(true);
    try {
      const order = await selectAddress(selectedAddressId);
      // selectAddress/refreshDraftOrder already surfaced a toast on
      // failure (see CheckoutContext) — just don't advance the step.
      if (order) navigate('/checkout/review');
    } finally {
      setIsContinuing(false);
    }
  };

  if (addressesStatus === 'loading' || addressesStatus === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-gray-900">
        {t('checkout.selectAddress', 'Select a delivery address')}
      </h2>

      {addresses.map((address) =>
        editingAddress?.id === address.id ? (
          <AddressForm
            key={address.id}
            initialValues={editingAddress}
            onSubmit={handleEditAddress}
            onCancel={() => setEditingAddress(null)}
            isSubmitting={isAddingAddress}
          />
        ) : (
          <AddressCard
            key={address.id}
            address={address}
            isSelected={address.id === selectedAddressId}
            onSelect={selectAddress}
            onEdit={(a) => {
              setShowForm(false);
              setEditingAddress(a);
            }}
            onDelete={handleDeleteAddress}
            isDeleting={deletingId === address.id}
          />
        )
      )}

      {showForm ? (
        <AddressForm
          onSubmit={handleAddAddress}
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
          isSubmitting={isAddingAddress}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingAddress(null);
            setShowForm(true);
          }}
          className="btn btn-outline self-start px-5 flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" aria-hidden />
          {t('checkout.addNewAddress', 'Add a new address')}
        </button>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedAddressId || isContinuing || draftStatus === 'loading'}
          className="btn btn-primary w-full sm:w-auto px-8 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isContinuing || draftStatus === 'loading'
            ? t('checkout.preparingOrder', 'Preparing your order…')
            : t('checkout.continueToPayment', 'Continue to Review & Payment')}
        </button>
      </div>
    </div>
  );
}
