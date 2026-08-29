// src/pages/AddressSelection/AddressSelectionPage.jsx — Checkout step 1
// See design_handoff_advika_auto/README.md, screen 6 "Checkout" step 1
// "Address". All data logic below is unchanged from before the reskin
// (see CheckoutContext) — only the markup is new. The wireframe assumes
// one fresh address per checkout; this keeps the app's existing (more
// capable) saved-address picker, styled to match, with the wireframe's
// form appearing for "add new".
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Shared/Icon';
import Spinner from '@/components/Shared/Spinner';
import AddressCard from '@/components/Address/AddressCard';
import AddressForm from '@/components/Address/AddressForm';
import CheckoutDarkSummary from '@/components/Checkout/CheckoutDarkSummary';
import { useCheckout } from '@/contexts/CheckoutContext';
import { handleError } from '@/utils/errorHandler';

export default function AddressSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    addresses, addressesStatus, loadAddresses, selectedAddressId, selectAddress,
    addAddress, editAddress, removeAddress, setDefaultAddress, draftStatus,
    draftOrder, isRestoring, goToStep,
  } = useCheckout();

  const [showForm, setShowForm] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  useEffect(() => { goToStep('address'); }, [goToStep]);

  useEffect(() => {
    if (isRestoring || addressesStatus !== 'idle') return;
    loadAddresses();
  }, [isRestoring, addressesStatus, loadAddresses]);

  const defaultedRef = React.useRef(false);
  useEffect(() => {
    if (isRestoring || addressesStatus !== 'ready' || defaultedRef.current) return;
    defaultedRef.current = true;
    if (addresses.length === 0) {
      setShowForm(true);
    } else if (!selectedAddressId) {
      const preferred = addresses.find((a) => a.isDefault) ?? addresses[addresses.length - 1];
      selectAddress(preferred.id);
    }
  }, [isRestoring, addressesStatus, addresses, selectedAddressId, selectAddress]);

  const handleAddAddress = async (payload) => {
    setIsAddingAddress(true);
    try {
      await addAddress(payload);
      setShowForm(false);
    } catch (error) {
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

  const handleSetDefault = async (id) => {
    setSettingDefaultId(id);
    try {
      await setDefaultAddress(id);
    } catch {
      // already toasted
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleContinue = async () => {
    if (!selectedAddressId) return;
    setIsContinuing(true);
    try {
      const order = await selectAddress(selectedAddressId);
      if (order) navigate('/checkout/review');
    } finally {
      setIsContinuing(false);
    }
  };

  if (addressesStatus === 'loading' || addressesStatus === 'idle') {
    return <div className="flex justify-center py-24"><Spinner size={40} /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-[9px] rounded border border-advika-border-light bg-white p-4">
        <Icon name="location_on" size={20} className="text-advika-orange" />
        <h2 className="text-[16px] font-bold text-advika-chrome">{t('checkout.selectAddress', 'Delivery Address')}</h2>
      </div>

      {addresses.map((address) =>
        editingAddress?.id === address.id ? (
          <AddressForm
            key={address.id} initialValues={editingAddress}
            onSubmit={handleEditAddress} onCancel={() => setEditingAddress(null)} isSubmitting={isAddingAddress}
          />
        ) : (
          <AddressCard
            key={address.id} address={address} isSelected={address.id === selectedAddressId}
            onSelect={selectAddress}
            onEdit={(a) => { setShowForm(false); setEditingAddress(a); }}
            onDelete={handleDeleteAddress} onSetDefault={handleSetDefault}
            isDeleting={deletingId === address.id} isSettingDefault={settingDefaultId === address.id}
          />
        )
      )}

      {showForm ? (
        <AddressForm
          onSubmit={handleAddAddress}
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
          isSubmitting={isAddingAddress}
          hideDefaultToggle={addresses.length === 0}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setEditingAddress(null); setShowForm(true); }}
          data-testid="address-selection-add-new-button"
          className="flex h-12 items-center justify-center gap-2 self-start rounded border-[1.5px] border-dashed border-advika-grey400 px-5 text-[13px] font-semibold text-advika-grey700"
        >
          <Icon name="add" size={17} /> {t('checkout.addNewAddress', 'Add a new address')}
        </button>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedAddressId || isContinuing || draftStatus === 'loading'}
          data-testid="address-selection-continue-button"
          className="aa-tracking flex h-[52px] items-center justify-center gap-[9px] rounded bg-advika-orange text-[14px] font-bold text-white disabled:opacity-60"
        >
          {isContinuing || draftStatus === 'loading'
            ? t('checkout.preparingOrder', 'Preparing your order…')
            : <>{t('checkout.continue', 'CONTINUE')} <span>→</span></>}
        </button>
      )}

      {draftOrder && <CheckoutDarkSummary order={draftOrder} />}
    </div>
  );
}
