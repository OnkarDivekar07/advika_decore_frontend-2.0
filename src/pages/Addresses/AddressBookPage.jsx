// src/pages/Addresses/AddressBookPage.jsx
//
// Standalone "manage my addresses" account page — add, edit, delete, and
// pick a default address, independent of any particular order (see
// checkout's own AddressSelectionPage for the "pick one for this order"
// flow, which reuses the exact same AddressCard/AddressForm components).
// Linked from the Account page's Addresses tab (UserProfilePage.jsx),
// which is read-only — this is where the real add/edit/delete/
// set-default mutations happen, restyled into the Advika Auto shell
// (design_handoff_advika_auto/README.md) rather than the legacy Navbar.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
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
    <div className="aa-shell min-h-screen bg-white">
      <Seo title={t('addresses.title', 'My Addresses')} noindex />
      <AdvikaHeader />

      <main id="main-content" tabIndex={-1}>
        {/* Title block */}
        <div className="flex flex-col gap-[9px] bg-advika-near-black px-4 pb-6 pt-[26px]">
          <button type="button" onClick={() => navigate('/profile?tab=addresses')} className="aa-label flex items-center gap-[6px] text-[10.5px] text-advika-grey600">
            <Icon name="arrow_back" size={15} /> {t('advika.account.tabProfile', 'MY PROFILE')}
          </button>
          <h1 className="aa-title-md text-white">
            {t('addresses.titleLine1', 'MY')} <span className="text-advika-orange">{t('addresses.titleAccent', 'ADDRESSES')}</span>
          </h1>
          <p className="text-[11.5px] text-advika-grey600">
            {t('addresses.subtitle', 'Manage the addresses you deliver to and pick a default.')}
          </p>
        </div>

        <div className="flex flex-col gap-3 px-[14px] pt-4 pb-6">
          {status === 'loading' || status === 'idle' ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <Spinner size={40} />
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center" role="alert">
              <Icon name="error" size={40} className="text-advika-grey600" />
              <p className="text-advika-grey800">
                {t('addresses.loadError', "We couldn't load your addresses.")}
              </p>
              <button type="button" onClick={load} className="h-11 border-[1.5px] border-advika-chrome px-6 text-[13px] font-bold">
                {t('buttons.retry', 'Retry')}
              </button>
            </div>
          ) : (
            <>
              {addresses.length === 0 && !showForm && (
                <div className="flex flex-col items-center gap-3 border border-advika-border-light p-8 text-center">
                  <Icon name="location_on" size={36} className="text-advika-grey600" />
                  <p className="text-advika-grey800">
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
                  className="flex h-14 items-center justify-center gap-2 border-[1.5px] border-dashed border-advika-grey400 bg-advika-off-white text-[13.5px] font-semibold text-advika-grey700"
                >
                  <Icon name="add" size={18} />
                  {t('checkout.addNewAddress', 'Add a new address')}
                </button>
              )}
            </>
          )}
        </div>

        <AdvikaFooter />
      </main>
    </div>
  );
}
