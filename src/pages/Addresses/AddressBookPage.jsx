// src/pages/Addresses/AddressBookPage.jsx
//
// Standalone "manage my addresses" account page — add, edit, delete, and
// pick a default address, independent of any particular order (see
// checkout's own AddressSelectionPage for the "pick one for this order"
// flow, which reuses the exact same AddressCard/AddressForm components).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiMapPin, FiAlertTriangle } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import Spinner from '@/components/Shared/Spinner';
import AddressCard from '@/components/Address/AddressCard';
import AddressForm from '@/components/Address/AddressForm';
import { useAuth } from '@/contexts/AuthContext';
import { useAddressBook } from '@/features/address/hooks/useAddressBook';

export default function AddressBookPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring } = useAuth();

  const {
    addresses,
    status,
    load,
    addAddress,
    editAddress,
    removeAddress,
    setDefaultAddress,
    isSaving,
    mutatingId,
  } = useAddressBook({ autoLoad: false });

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Same belt-and-suspenders guard CheckoutLayout uses: this page is
  // meaningless signed out, so bounce home the moment we're sure there's
  // no session, rather than rendering a page that has nothing to show.
  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isRestoring, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  if (isRestoring || !isAuthenticated) return null;

  const handleAdd = async (payload) => {
    try {
      await addAddress(payload);
      setShowForm(false);
    } catch {
      // useAddressBook already surfaced a toast — nothing else to do.
    }
  };

  const handleEdit = async (payload) => {
    try {
      await editAddress(editingAddress.id, payload);
      setEditingAddress(null);
    } catch {
      // Toasted already.
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('checkout.confirmDeleteAddress', 'Remove this address?'))) return;
    try {
      await removeAddress(id);
    } catch {
      // Toasted already.
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12" id="main-content" tabIndex={-1}>
        <h1 className="section-title mb-2">{t('addresses.title', 'My Addresses')}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {t('addresses.subtitle', 'Manage the addresses you deliver to and pick a default.')}
        </p>

        {status === 'loading' || status === 'idle' ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Spinner size={40} />
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center" role="alert">
            <FiAlertTriangle className="w-12 h-12 text-red-300" aria-hidden />
            <p className="text-gray-600">
              {t('addresses.loadError', "We couldn't load your addresses.")}
            </p>
            <button onClick={load} className="btn btn-outline px-6">
              {t('buttons.retry', 'Retry')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {addresses.length === 0 && !showForm && (
              <div className="card p-8 flex flex-col items-center text-center gap-3">
                <FiMapPin className="w-10 h-10 text-gray-300" aria-hidden />
                <p className="text-gray-600">
                  {t('addresses.empty', "You haven't saved any addresses yet.")}
                </p>
              </div>
            )}

            {addresses.map((address) =>
              editingAddress?.id === address.id ? (
                <AddressForm
                  key={address.id}
                  initialValues={editingAddress}
                  onSubmit={handleEdit}
                  onCancel={() => setEditingAddress(null)}
                  isSubmitting={isSaving}
                />
              ) : (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={(a) => {
                    setShowForm(false);
                    setEditingAddress(a);
                  }}
                  onDelete={handleDelete}
                  onSetDefault={setDefaultAddress}
                  isDeleting={mutatingId === address.id}
                  isSettingDefault={mutatingId === address.id}
                />
              )
            )}

            {showForm ? (
              <AddressForm
                onSubmit={handleAdd}
                onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
                isSubmitting={isSaving}
                hideDefaultToggle={addresses.length === 0}
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
          </div>
        )}
      </main>
    </>
  );
}
