// src/pages/UserProfile/UserProfilePage.jsx
//
// /profile — the customer account hub: profile info + inline name edit,
// mobile number + change flow, and quick links out to Saved Addresses
// (/addresses) and My Orders (/orders) — both already their own pages —
// plus Wishlist (/wishlist), Account Settings (language), and Logout.
// Kept as one page rather than splitting settings/mobile into further
// sub-routes: on mobile this reads as a single scrollable account
// screen, which is the more familiar pattern (and there's little here
// that benefits from being its own route the way Addresses/Orders — each
// with their own list + CRUD — do).
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  FiUser,
  FiPhone,
  FiMapPin,
  FiPackage,
  FiHeart,
  FiSettings,
  FiLogOut,
  FiEdit2,
  FiLoader,
  FiChevronRight,
  FiGlobe,
} from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import MobileNumberChange from '@/components/Account/MobileNumberChange';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { LanguageContext } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/config/supportedLanguages';
import { useProfile } from '@/features/account/hooks/useProfile';

function AccountLinkRow({ icon: Icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
    >
      <span className="p-2 rounded-full bg-[var(--clr-primary)]/10 text-[var(--clr-primary-dark)] shrink-0">
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
      <FiChevronRight className="w-4 h-4 text-gray-300 shrink-0" aria-hidden />
    </button>
  );
}

export default function UserProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, updateUser, isAuthenticated, isRestoring } = useAuth();
  const { language, changeLanguage } = useContext(LanguageContext);
  const { profile, status, load, updateName, applyProfile, isSaving } = useProfile({
    autoLoad: false,
  });
  const { count: wishlistCount } = useWishlist();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Same belt-and-suspenders guard AddressBookPage/OrderListPage use:
  // this page is meaningless signed out, so bounce home the moment we're
  // sure there's no session, rather than rendering an API-error page for
  // logged-out users.
  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isRestoring, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  if (isRestoring || !isAuthenticated) return null;

  const startEditName = () => {
    setNameDraft(profile?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      toast.error(t('account.nameTooShort', 'Name must be at least 2 characters.'));
      return;
    }
    try {
      await updateName(trimmed);
      setIsEditingName(false);
      toast.success(t('account.nameUpdated', 'Name updated.'));
    } catch {
      // useProfile already toasted the failure.
    }
  };

  const handlePhoneChanged = (updated) => {
    applyProfile(updated);
    updateUser({ phone: updated.phone });
    setIsChangingPhone(false);
    toast.success(t('account.phoneUpdated', 'Mobile number updated.'));
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <>
      <Navbar />
      <Seo title={t('account.title', 'My Account')} noindex />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12" id="main-content" tabIndex={-1}>
        <h1 className="section-title mb-6">{t('account.title', 'My Account')}</h1>

        {status === 'loading' || status === 'idle' ? (
          <div className="flex justify-center py-20">
            <Spinner size={40} />
          </div>
        ) : status === 'error' ? (
          <div className="card p-8 flex flex-col items-center text-center gap-3" role="alert">
            <p className="text-gray-600">{t('account.loadError', "We couldn't load your account.")}</p>
            <button onClick={load} className="btn btn-outline px-6">
              {t('buttons.retry', 'Retry')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Profile card: name + mobile */}
            <section className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-12 h-12 rounded-full bg-[var(--clr-primary)]/15 text-[var(--clr-primary-dark)] flex items-center justify-center shrink-0">
                    <FiUser className="w-5 h-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    {isEditingName ? (
                      <form onSubmit={handleSaveName} className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          maxLength={80}
                          aria-label={t('account.editName', 'Edit name')}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm w-40 sm:w-48 focus:outline-none focus:ring-2 focus:ring-[var(--clr-primary)]/40"
                        />
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="text-xs font-medium text-[var(--clr-primary-dark)] disabled:opacity-60"
                        >
                          {isSaving ? <FiLoader className="w-4 h-4 animate-spin" /> : t('buttons.save', 'Save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingName(false)}
                          className="text-xs text-gray-500"
                        >
                          {t('buttons.cancel', 'Cancel')}
                        </button>
                      </form>
                    ) : (
                      <p className="font-semibold text-gray-900 truncate">
                        {profile?.name || t('account.noName', 'Add your name')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  </div>
                </div>
                {!isEditingName && (
                  <button
                    onClick={startEditName}
                    aria-label={t('account.editName', 'Edit name')}
                    className="p-2 text-gray-500 hover:text-gray-600 shrink-0"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <FiPhone className="w-4 h-4 text-gray-500" aria-hidden />
                    <span>+91 {profile?.phone}</span>
                  </div>
                  <button
                    onClick={() => setIsChangingPhone((v) => !v)}
                    aria-expanded={isChangingPhone}
                    className="text-xs font-medium text-[var(--clr-primary-dark)] hover:underline"
                  >
                    {isChangingPhone
                      ? t('buttons.cancel', 'Cancel')
                      : t('account.change', 'Change')}
                  </button>
                </div>

                {isChangingPhone && (
                  <MobileNumberChange
                    currentPhone={profile?.phone}
                    onChanged={handlePhoneChanged}
                    onClose={() => setIsChangingPhone(false)}
                  />
                )}
              </div>
            </section>

            {/* Quick links */}
            <section className="card divide-y divide-gray-100 overflow-hidden">
              <AccountLinkRow
                icon={FiMapPin}
                label={t('account.savedAddresses', 'Saved Addresses')}
                description={t('account.savedAddressesDesc', 'Manage your delivery addresses')}
                onClick={() => navigate('/addresses')}
              />
              <AccountLinkRow
                icon={FiPackage}
                label={t('orders.navLabel', 'My Orders')}
                description={t('account.myOrdersDesc', 'Track and review past orders')}
                onClick={() => navigate('/orders')}
              />
              <AccountLinkRow
                icon={FiHeart}
                label={t('wishlist.title', 'My Wishlist')}
                description={
                  wishlistCount > 0
                    ? t('account.wishlistCountDesc', '{{count}} item(s) saved', { count: wishlistCount })
                    : t('account.wishlistDesc', 'Products you have saved')
                }
                onClick={() => navigate('/wishlist')}
              />
            </section>

            {/* Account settings */}
            <section className="card overflow-hidden">
              <button
                onClick={() => setIsSettingsOpen((v) => !v)}
                aria-expanded={isSettingsOpen}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="p-2 rounded-full bg-[var(--clr-primary)]/10 text-[var(--clr-primary-dark)] shrink-0">
                  <FiSettings className="w-4 h-4" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-medium text-gray-800">
                  {t('account.settings', 'Account Settings')}
                </span>
                <FiChevronRight
                  className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`}
                  aria-hidden
                />
              </button>

              {isSettingsOpen && (
                <div className="px-4 pb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <FiGlobe className="w-3.5 h-3.5" aria-hidden />
                    {t('account.language', 'Language')}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => (
                      <button
                        key={code}
                        onClick={() => changeLanguage(code)}
                        aria-pressed={language === code}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          language === code
                            ? 'bg-[var(--clr-primary)] text-[#111] border-[var(--clr-primary)]'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="btn btn-outline w-full flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <FiLogOut className="w-4 h-4" aria-hidden />
              {t('account.logout', 'Logout')}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
