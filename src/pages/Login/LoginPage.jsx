// src/pages/Login/LoginPage.jsx — Advika Auto Login / Signup
// See design_handoff_advika_auto/README.md, screen 7 "Login / Signup".
// White background (the only light-shell screen), no footer. Reuses
// useOtpFlow (shared with PhoneOtpModal/OTPVerificationPage) for the
// real phone -> OTP -> session flow. The profile step's vehicle field
// is persisted to the User record (see prisma/schema.prisma's `vehicle`
// field and PATCH /api/user/profile) so it survives a device switch and
// can drive the README's Roadmap #1 "vehicle-aware fitment" — a
// localStorage-only value never could. City has no backend field yet
// (not part of that roadmap item) and stays local-only.
import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageContext } from '@/contexts/LanguageContext';
import { useOtpFlow, STEP_PHONE, STEP_OTP } from '@/features/auth/hooks/useOtpFlow';
import { translateOtpResult } from '@/features/auth/utils/otpMessages';
import { updateProfile } from '@/services/userService';
import { toast } from 'react-toastify';

const STEP_PROFILE = 'profile';
const STEP_SUCCESS = 'success';

// id -> the backend's VALID_VEHICLES enum (user.validation.js).
const VEHICLE_OPTIONS = [
  { id: 'truck', backendValue: 'Truck', icon: 'local_shipping', key: 'advika.login.vehicleTruck' },
  { id: 'pickup', backendValue: 'Pickup', icon: 'local_shipping', key: 'advika.login.vehiclePickup' },
  { id: 'tempo', backendValue: 'Tempo', icon: 'airport_shuttle', key: 'advika.login.vehicleTempo' },
  { id: 'tractor', backendValue: 'Tractor', icon: 'agriculture', key: 'advika.login.vehicleTractor' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  // Only tracks the two steps *after* otpFlow hands off (profile/success);
  // phone/otp view state is derived from otpFlow.step itself below so the
  // two can never fall out of sync (see handleSendOtp's comment).
  const [screenStep, setScreenStep] = useState(null); // null | profile | success
  const [isNewUser, setIsNewUser] = useState(true);
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [vehicle, setVehicle] = useState(null);

  const otpFlow = useOtpFlow({
    onVerified: () => setScreenStep(isNewUser ? STEP_PROFILE : STEP_SUCCESS),
  });
  const currentView = screenStep === STEP_PROFILE || screenStep === STEP_SUCCESS ? screenStep : otpFlow.step;

  // otpFlow owns the phone <-> otp transition itself (including reverting
  // to its own STEP_PHONE on a rate limit / exhausted-attempts error);
  // `currentView` below just follows it, so this only needs to surface
  // the error toast, never juggle a duplicate step of our own.
  const handleSendOtp = useCallback(async (e) => {
    e.preventDefault();
    const result = await otpFlow.sendOtp();
    if (!result.ok) toast.error(translateOtpResult(t, result));
  }, [otpFlow, t]);

  const handleVerify = useCallback(async (e) => {
    e.preventDefault();
    const result = await otpFlow.verifyOtp();
    if (!result.ok) toast.error(translateOtpResult(t, result));
  }, [otpFlow, t]);

  const handleResend = useCallback(async () => {
    const result = await otpFlow.resendOtp();
    toast[result.ok ? 'success' : 'error'](translateOtpResult(t, result));
  }, [otpFlow, t]);

  const finishProfile = useCallback(async () => {
    const name = fullName.trim();
    const backendVehicle = vehicle
      ? VEHICLE_OPTIONS.find((opt) => opt.id === vehicle)?.backendValue
      : undefined;

    if (name) updateUser({ name });
    if (city) localStorage.setItem('advika_city', city);

    if (name || backendVehicle) {
      try {
        const patch = {};
        if (name) patch.name = name;
        if (backendVehicle) patch.vehicle = backendVehicle;
        const profile = await updateProfile(patch);
        updateUser(profile);
      } catch {
        // Non-fatal — the account is already created and verified by this
        // point (see onVerified above); a failed profile PATCH shouldn't
        // block the signup flow from completing. The user can fill these
        // in again from the Account page.
        toast.error(t('advika.login.profileSaveFailed', "Couldn't save your profile — you can update it later from My Profile."));
      }
    }
    setScreenStep(STEP_SUCCESS);
  }, [fullName, vehicle, city, updateUser, t]);

  return (
    <div className="aa-shell flex min-h-screen flex-col bg-white">
      <Seo title={t('advika.login.welcomeBack', 'Welcome back')} noindex />

      {/* Present on every step including success — README's nav map:
          "the header home icon is present on all ten screens, including
          login." Unlike the dark-shell screens' orange/grey home icon,
          this white-shell strip keeps both escape hatches in the same
          #a3a3a3 grey (README: "login places it beside the close control
          in #a3a3a3"). */}
      <LanguageContext.Consumer>
        {({ language, changeLanguage }) => (
          <div className="flex items-center justify-between px-[14px] pt-4">
            <div className="flex overflow-hidden rounded border border-advika-border-light">
              {['en', 'hi', 'mr'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => changeLanguage(code)}
                  className={`aa-mono flex h-8 min-w-[30px] items-center justify-center px-2 text-[10.5px] font-semibold ${
                    language === code ? 'bg-advika-orange text-white' : 'text-advika-grey600'
                  }`}
                >
                  {t(`advika.header.lang${code === 'en' ? 'En' : code === 'hi' ? 'Hi' : 'Mr'}`)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Link to="/" aria-label={t('common.home', 'Home')} className="flex h-9 w-9 items-center justify-center text-advika-grey600">
                <Icon name="home" size={21} />
              </Link>
              {currentView !== STEP_SUCCESS && (
                <Link to="/" aria-label={t('common.close', 'Close')} className="flex h-9 w-9 items-center justify-center text-advika-grey600">
                  <Icon name="close" size={21} />
                </Link>
              )}
            </div>
          </div>
        )}
      </LanguageContext.Consumer>

      <div className="flex flex-1 flex-col justify-center gap-[26px] px-[22px] py-10">
        <div className="flex items-center gap-2">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-advika-orange">
            <Icon name="bolt" className="text-white" size={22} />
          </span>
          <span className="font-archivoBlack text-[19px] text-advika-chrome">
            ADVIKA <span className="text-advika-orange">AUTO</span>
          </span>
        </div>

        {currentView === STEP_PHONE && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-[26px]">
            <div className="flex flex-col gap-[7px]">
              <h1 className="aa-title-auth text-advika-chrome">{t('advika.login.welcomeBack')}</h1>
              <p className="text-[14px] text-advika-grey700">{t('advika.login.phoneSubhead')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="aa-label text-[9.5px] text-advika-orange-dark">{t('advika.login.mobileNumber')}</label>
              <div className="flex h-[54px] overflow-hidden rounded border-[1.5px] border-advika-orange">
                <span className="aa-mono flex items-center gap-1 border-r border-advika-border-light bg-advika-off-white px-[11px] text-[14px] font-semibold">
                  <span className="rounded bg-advika-chrome px-1 text-[9px] text-white">IN</span> +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={otpFlow.phoneDigits}
                  onChange={(e) => otpFlow.setPhoneDigits(e.target.value)}
                  placeholder={t('otp.phonePlaceholder', '10-digit mobile number')}
                  className="aa-mono w-full px-3 text-[16px] tracking-[.05em] outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!otpFlow.isPhoneValid || otpFlow.isSubmitting || otpFlow.cooldown > 0}
              className="flex h-[54px] items-center justify-center bg-advika-orange text-[14px] font-bold text-white disabled:opacity-50"
            >
              {otpFlow.isSubmitting ? t('otp.sendingOtp', 'Sending OTP…') : t('advika.login.sendOtp')}
            </button>
            <p className="text-[12px] text-advika-grey600">
              {t('advika.login.termsPrefix')}{' '}
              <span className="font-semibold text-advika-orange">{t('advika.login.termsOfService')}</span>{' '}
              {t('advika.login.termsAnd')}{' '}
              <span className="font-semibold text-advika-orange">{t('advika.login.privacyPolicy')}</span>
            </p>
            <div className="flex flex-col gap-3 border-t border-advika-divider-light pt-4">
              {[
                ['local_shipping', 'perkTracking'],
                ['favorite_border', 'perkWishlist'],
                ['payments', 'perkCheckout'],
              ].map(([icon, key]) => (
                <div key={key} className="flex items-center gap-[10px]">
                  <Icon name={icon} size={19} className="text-advika-orange" />
                  <span className="text-[12.5px] text-advika-grey800">{t(`advika.login.${key}`)}</span>
                </div>
              ))}
            </div>
          </form>
        )}

        {currentView === STEP_OTP && (
          <form onSubmit={handleVerify} className="flex flex-col gap-[22px]">
            <button
              type="button"
              onClick={otpFlow.changeNumber}
              className="flex items-center gap-1 text-[13px] text-advika-grey700"
            >
              <Icon name="chevron_left" size={17} /> {t('advika.login.back', 'Back')}
            </button>
            <div className="flex flex-col gap-[7px]">
              <h1 className="aa-title-auth text-advika-chrome">{t('advika.login.verifyOtp')}</h1>
              <p className="text-[13.5px] text-advika-grey700">
                {t('advika.login.otpSentTo', '6-digit OTP sent to')} <strong className="text-advika-chrome">{otpFlow.fullPhone}</strong>
              </p>
              <button type="button" onClick={otpFlow.changeNumber} className="w-fit text-[13px] font-semibold text-advika-orange">
                {t('advika.login.changeNumber')}
              </button>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, idx) => {
                const filled = idx < otpFlow.otp.length;
                const isNext = idx === otpFlow.otp.length;
                return (
                  <span
                    key={idx}
                    className={`aa-mono flex h-[54px] flex-1 items-center justify-center rounded-md text-[20px] font-semibold ${
                      filled || isNext ? 'border-[1.5px] border-advika-orange' : 'border-[1.5px] border-advika-grey400'
                    } ${filled ? 'bg-advika-orange-tint' : ''}`}
                  >
                    {otpFlow.otp[idx] || ''}
                  </span>
                );
              })}
            </div>
            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              value={otpFlow.otp}
              onChange={(e) => otpFlow.setOtp(e.target.value)}
              className="sr-only"
              aria-label={t('otp.codeLabel', '6-digit code')}
            />
            <button
              type="submit"
              disabled={!otpFlow.isOtpValid || otpFlow.isSubmitting}
              className={`flex h-[54px] items-center justify-center text-[14px] font-bold ${
                otpFlow.isOtpValid ? 'bg-advika-orange text-white' : 'bg-[#e9e7e3] text-advika-grey600'
              } disabled:opacity-70`}
            >
              {otpFlow.isSubmitting ? t('otp.verifying', 'Verifying…') : t('otp.verifyAndContinue', 'Verify & Continue')}
            </button>
            <p className="text-[12.5px] text-advika-grey700">
              {t('advika.login.didntReceive')}{' '}
              {otpFlow.cooldown > 0 ? (
                <span className="font-semibold">{t('advika.login.resendIn', { seconds: otpFlow.cooldown })}</span>
              ) : (
                <button type="button" onClick={handleResend} className="font-semibold text-advika-orange">
                  {t('advika.login.resendNow')}
                </button>
              )}
            </p>
            <label className="flex items-center gap-3 border-t border-advika-divider-light pt-4">
              <span
                onClick={() => setIsNewUser((v) => !v)}
                role="checkbox"
                aria-checked={isNewUser}
                tabIndex={0}
                onKeyDown={(e) => {
                  // Space is the native way to toggle a checkbox — without
                  // preventDefault it also scrolls the page (WCAG 2.1.1),
                  // same fix as AddressCard's role="button" handler.
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsNewUser((v) => !v);
                  }
                }}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] ${isNewUser ? 'bg-advika-orange' : 'border border-advika-grey400'}`}
              >
                {isNewUser && <Icon name="check" size={14} className="text-white" />}
              </span>
              <span className="text-[13px] text-advika-grey800">{t('advika.login.newUserCheckbox')}</span>
            </label>
          </form>
        )}

        {currentView === STEP_PROFILE && (
          <div className="flex flex-col gap-[20px]">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-advika-success">
              <Icon name="verified" size={18} /> {t('advika.login.numberVerified')}
            </span>
            <div className="flex flex-col gap-[7px]">
              <h1 className="aa-title-auth text-advika-chrome">{t('advika.login.completeProfile')}</h1>
              <p className="text-[13.5px] text-advika-grey700">{t('advika.login.profileRationale')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="aa-label text-[9.5px] text-advika-orange-dark">{t('advika.login.fullNameLabel', 'FULL NAME')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('advika.login.fullName')}
                className="h-[52px] rounded border-[1.5px] border-advika-orange px-3 text-[15px] outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="aa-label text-[9.5px] text-advika-orange-dark">{t('advika.login.cityLabel', 'CITY')}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('advika.login.city')}
                className="h-[52px] rounded border border-advika-grey400 px-3 text-[15px] outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="aa-label text-[9.5px] text-advika-orange-dark">{t('advika.login.vehicleLabel')}</label>
              <div className="grid grid-cols-2 gap-[9px]">
                {VEHICLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVehicle(opt.id)}
                    className={`flex h-14 items-center gap-[10px] rounded border-[1.5px] px-3 text-[13.5px] font-semibold ${
                      vehicle === opt.id ? 'border-advika-orange bg-advika-orange-tint text-advika-orange-darker2' : 'border-advika-border-light text-advika-chrome'
                    }`}
                  >
                    <Icon name={opt.icon} size={24} className={vehicle === opt.id ? 'text-advika-orange' : 'text-advika-grey600'} />
                    {t(opt.key)}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={finishProfile} className="flex h-[54px] items-center justify-center bg-advika-orange text-[14px] font-bold text-white">
              {t('advika.login.createAccount')}
            </button>
            <button type="button" onClick={() => setScreenStep(STEP_SUCCESS)} className="text-center text-[12.5px] text-advika-grey600">
              {t('advika.login.skipForNow')}
            </button>
          </div>
        )}

        {currentView === STEP_SUCCESS && (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-[74px] w-[74px] items-center justify-center rounded-2xl bg-advika-success">
              <Icon name="check_circle" size={42} className="text-white" />
            </span>
            <h1 className="font-archivoBlack text-[25px] text-advika-chrome">{t('advika.login.loggedIn')}</h1>
            <p className="text-[13.5px] text-advika-grey700">{t('advika.login.loggedInBody')}</p>
            <button type="button" onClick={() => navigate('/')} className="flex h-[52px] w-full items-center justify-center bg-advika-orange text-[14px] font-bold text-white">
              {t('advika.login.startShopping')}
            </button>
            <button type="button" onClick={() => navigate('/profile')} className="flex h-[52px] w-full items-center justify-center border-[1.5px] border-advika-chrome text-[14px] font-bold text-advika-chrome">
              {t('advika.login.viewProfile')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
