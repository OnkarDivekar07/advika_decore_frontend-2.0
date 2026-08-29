// src/pages/UserProfile/UserProfilePage.jsx — Advika Auto Account
// See design_handoff_advika_auto/README.md, screen 8 "Account". Reuses
// useProfile / useOrderHistory / useAddressBook (existing hooks already
// wired to the real backend) — only the presentation layer is new.
// Notification preferences have no backend field yet (see
// prisma/schema.prisma's User model), so they're shown as local-only
// toggles rather than fabricated as persisted settings.
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import Spinner from '@/components/Shared/Spinner';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/features/account/hooks/useProfile';
import { useOrderHistory, STATUS_LOADING } from '@/features/orders/hooks/useOrderHistory';
import { useAddressBook } from '@/features/address/hooks/useAddressBook';

const STATUS_STYLE = {
  delivered: 'bg-advika-success-tint text-advika-success-dark border-advika-success-border',
  shipped: 'bg-advika-info-tint text-[#1d4ed8] border-advika-info-border',
  confirmed: 'bg-advika-info-tint text-[#1d4ed8] border-advika-info-border',
  pending: 'bg-advika-warm-white text-advika-grey700 border-advika-border-light',
  cancelled: 'bg-red-50 text-advika-danger border-red-200',
  returned: 'bg-advika-warm-white text-advika-grey700 border-advika-border-light',
};

const TABS = ['profile', 'orders', 'addresses'];

// Backend vehicle enum (user.validation.js's VALID_VEHICLES) -> the same
// i18n keys the Login screen's vehicle picker uses, so the two surfaces
// always agree on how a vehicle class is labelled.
const VEHICLE_LABEL_KEYS = {
  Truck: 'advika.login.vehicleTruck',
  Pickup: 'advika.login.vehiclePickup',
  Tempo: 'advika.login.vehicleTempo',
  Tractor: 'advika.login.vehicleTractor',
};

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UserProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, status: profileStatus } = useProfile();
  const { orders, status: orderStatus } = useOrderHistory(1);
  const { addresses, status: addressStatus } = useAddressBook();
  // URL-driven so the Account page's tabs are real, linkable destinations
  // — the footer's "My orders", the slide menu's "My orders"/"My
  // wishlist", and a bookmarked /profile?tab=orders all land on the
  // right tab of this one screen instead of a separate, unstyled page
  // (see AppRoutes.jsx's /orders and /addresses redirects).
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = TABS.includes(tabParam) ? tabParam : 'profile';
  const setActiveTab = (tab) => setSearchParams(tab === 'profile' ? {} : { tab }, { replace: true });
  const [prefs, setPrefs] = useState({ sms: true, email: false, whatsapp: true });

  const handleLogout = () => {
    logout();
    // README's navigation map: "Account ──► ... Login (sign out)" —
    // Account.dc.html:60 links sign-out to the login screen, not home.
    navigate('/login');
  };

  if (profileStatus === 'loading' && !profile) {
    return (
      <div className="aa-shell flex min-h-screen items-center justify-center bg-white">
        <Spinner size={40} />
      </div>
    );
  }

  const initial = (profile?.name || '?')[0]?.toUpperCase();

  return (
    <div className="aa-shell aa-page-account min-h-screen bg-white">
      <Seo title={t('advika.account.tabProfile', 'My Profile')} noindex />
      <AdvikaHeader />

      <main id="main-content" tabIndex={-1}>
        {/* Identity block */}
        <div className="flex flex-col gap-[18px] bg-advika-near-black px-4 pt-5">
          <div className="flex items-center gap-[13px]">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg bg-advika-orange font-archivoBlack text-[22px] text-white">
              {initial}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="truncate font-archivoBlack text-[19px] leading-[1.1] text-white">{profile?.name || '—'}</div>
              <div className="aa-mono text-[11.5px] text-advika-orange">{profile?.phone}</div>
              {profile?.email && <div className="aa-mono truncate text-[10.5px] text-advika-grey700">{profile.email}</div>}
            </div>
            <button type="button" onClick={handleLogout} data-testid="profile-logout-button" className="flex shrink-0 flex-col items-center gap-[3px] text-advika-grey600">
              <Icon name="logout" size={19} />
              <span className="text-[10px] leading-[1.2]">{t('advika.account.signOut')}</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-advika-border-dark">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                data-testid={`profile-tab-${tab}`}
                className={`aa-label h-[46px] flex-1 text-[10.5px] font-bold ${
                  activeTab === tab ? 'bg-advika-orange text-white' : 'text-advika-grey600'
                }`}
              >
                {t(`advika.account.tab${tab[0].toUpperCase()}${tab.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4 px-4 py-5">
            <div className="rounded border border-advika-border-light p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-advika-chrome">{t('advika.account.personalDetails')}</h2>
                <span className="flex items-center gap-[5px] text-[12px] font-semibold text-advika-orange-dark">
                  <Icon name="edit" size={15} className="text-advika-orange" /> {t('advika.account.editProfile')}
                </span>
              </div>
              {[
                [t('advika.account.fullName'), profile?.name],
                [t('advika.account.mobile'), profile?.phone],
                [t('advika.account.email'), profile?.email || '—'],
                [t('advika.account.dob', 'Date of birth'), formatDate(profile?.dateOfBirth)],
                [
                  t('advika.account.vehicle', 'Vehicle'),
                  profile?.vehicle ? t(VEHICLE_LABEL_KEYS[profile.vehicle] || '', profile.vehicle) : '—',
                ],
                [t('advika.account.memberSince'), formatDate(profile?.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 border-t border-advika-divider-light pt-[13px] mt-[13px] first:mt-0 first:border-0 first:pt-0">
                  <span className="aa-label text-[9px] font-semibold text-advika-grey600">{label}</span>
                  <span className="text-[14.5px] text-advika-chrome">{value || '—'}</span>
                </div>
              ))}
            </div>

            <div className="rounded border border-advika-border-light p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="notifications" size={18} className="text-advika-orange" />
                <h2 className="text-[15px] font-bold text-advika-chrome">{t('advika.account.notificationPrefs')}</h2>
              </div>
              <div className="flex flex-col gap-[14px]">
                {[
                  ['sms', t('advika.account.prefOrderSms')],
                  ['email', t('advika.account.prefPromoEmail')],
                  ['whatsapp', t('advika.account.prefNewWhatsapp')],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-[11px]">
                    <span
                      role="checkbox"
                      aria-checked={prefs[key]}
                      tabIndex={0}
                      onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                      onKeyDown={(e) => {
                        // Space is the native way to toggle a checkbox — without
                        // preventDefault it also scrolls the page (WCAG 2.1.1),
                        // same fix as AddressCard's role="button" handler.
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPrefs((p) => ({ ...p, [key]: !p[key] }));
                        }
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] ${prefs[key] ? 'bg-advika-orange' : 'border border-advika-grey400'}`}
                    >
                      {prefs[key] && <Icon name="check" size={15} className="text-white" />}
                    </span>
                    <span className="text-[13.5px] leading-[1.4] text-advika-grey900">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-3 px-4 py-5">
            {/* Spin only while the fetch is genuinely in flight — the
                original `orderStatus !== STATUS_SUCCESS` check also
                matched STATUS_EMPTY (a resolved, zero-order account),
                which meant an account with no orders spun forever and
                never reached the "no orders yet" message below. */}
            {orderStatus === STATUS_LOADING && orders.length === 0 ? (
              <div className="flex justify-center py-10"><Spinner size={32} /></div>
            ) : orders.length === 0 ? (
              <p className="py-8 text-center text-[13.5px] text-advika-grey700">{t('advika.account.noOrders')}</p>
            ) : (
              orders.map((order) => {
                const style = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
                const summary = (order.orderItems || []).map((i) => i.product?.name).filter(Boolean).join(', ');
                return (
                  <Link key={order.id} to={`/orders/${order.id}/track`} className="flex flex-col gap-[11px] rounded border border-advika-border-light p-[15px]">
                    <div className="flex items-start justify-between gap-[10px]">
                      <div className="flex flex-col gap-[5px]">
                        <div className="aa-mono text-[14.5px] font-semibold text-advika-chrome">{order.id}</div>
                        <div className="flex items-center gap-[5px] text-[11px] text-advika-grey700">
                          <Icon name="calendar_today" size={14} className="text-advika-grey600" /> <span className="aa-label">{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-[3px] border px-[9px] py-[5px] text-[11px] font-bold ${style}`}>
                        {t(`orders.status.${order.status}`, order.status)}
                      </span>
                    </div>
                    {summary && (
                      <p className="truncate border-t border-advika-divider-light pt-[11px] text-[13px] font-semibold leading-[1.4] text-advika-orange-dark">
                        {summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] text-advika-grey800">
                        {t('orders.itemCount', '{{count}} items', { count: (order.orderItems || []).reduce((a, i) => a + (i.quantity || 0), 0) })} · <span className="aa-mono font-semibold text-advika-chrome">₹{(order.total ?? 0).toFixed(2)}</span>
                      </span>
                      <span className="flex items-center gap-[5px] text-[12.5px] font-semibold text-advika-orange-dark">
                        {t('advika.account.trackOrder')} <Icon name="arrow_forward" size={15} />
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Addresses tab */}
        {activeTab === 'addresses' && (
          <div className="flex flex-col gap-3 px-4 py-5">
            {addressStatus === 'loading' ? (
              <div className="flex justify-center py-10"><Spinner size={32} /></div>
            ) : addresses.length === 0 ? (
              <p className="py-4 text-center text-[13.5px] text-advika-grey700">{t('advika.account.noAddresses')}</p>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} className={`flex flex-col gap-[11px] rounded border-[1.5px] p-[15px] ${addr.isDefault ? 'border-advika-orange' : 'border-advika-border-light'}`}>
                  <div className="flex items-center justify-between gap-[10px]">
                    <div className="flex items-center gap-[7px]">
                      <span className="rounded-[3px] border border-advika-border-light bg-advika-off-white px-[9px] py-[4px] text-[11.5px] font-bold text-advika-grey900">
                        {addr.type || t('advika.account.tabAddresses')}
                      </span>
                      {addr.isDefault && (
                        <span className="rounded-[3px] border border-advika-orange-border bg-advika-orange-tint px-[9px] py-[4px] text-[11px] font-bold text-advika-orange-darker">
                          {t('advika.account.defaultChip')}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-[5px] text-[12px] font-semibold text-advika-orange-dark">
                      <Icon name="edit" size={15} className="text-advika-orange" />
                      <Link to="/addresses">{t('advika.account.edit')}</Link>
                    </span>
                  </div>
                  <div className="flex flex-col gap-[5px] border-t border-advika-divider-light pt-[11px]">
                    <div className="text-[14px] font-bold text-advika-chrome">{addr.name}</div>
                    <div className="text-[13px] leading-[1.55] text-advika-grey800">{addr.houseArea}{addr.area ? `, ${addr.area}` : ''}</div>
                    <div className="text-[13px] leading-[1.55] text-advika-grey800">{addr.city}, {addr.state} — {addr.pincode}</div>
                  </div>
                </div>
              ))
            )}
            <Link to="/addresses" className="flex h-14 items-center justify-center gap-2 rounded border-[1.5px] border-dashed border-advika-grey400 bg-advika-off-white text-[13.5px] font-semibold">
              <Icon name="add" size={19} className="text-advika-grey700" /> <span className="text-advika-grey800">{t('advika.account.addNewAddress')}</span>
            </Link>
          </div>
        )}

        <AdvikaFooter />
      </main>
    </div>
  );
}
