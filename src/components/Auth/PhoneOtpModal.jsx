// src/components/Auth/PhoneOtpModal.jsx
//
// Two-step "verify to continue" modal: enter mobile number -> enter the
// OTP sent to it. This is the ONLY place in the app that asks for a
// phone number as part of the checkout gate — it only ever appears
// because something requiring an identity (checkout) called
// `requireAuth()` (see AuthGateContext).
//
// All the actual flow logic (validation, cooldowns, resend/verify
// attempt limits, error handling) lives in `useOtpFlow`, shared with
// OTPVerificationPage, so both surfaces behave identically. Styled to
// match the Advika Auto design system (see LoginPage/LanguageModal) —
// orange/chrome tokens, `aa-*` type scale — rather than the app's older
// legacy theme.
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { useOtpFlow, STEP_PHONE, STEP_OTP } from '@/features/auth/hooks/useOtpFlow';
import { translateOtpResult } from '@/features/auth/utils/otpMessages';
import useModalA11y from '@/hooks/useModalA11y';

const formatMmSs = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function PhoneOtpModal({ isOpen, onClose, onVerified }) {
  const { t } = useTranslation();
  const otpInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const flow = useOtpFlow({ onVerified });
  const {
    step,
    phoneDigits,
    setPhoneDigits,
    otp,
    setOtp,
    isPhoneValid,
    isOtpValid,
    isSubmitting,
    cooldown,
    isOtpLikelyExpired,
    otpSecondsRemaining,
    sendOtp,
    resendOtp,
    verifyOtp,
    changeNumber,
    reset,
  } = flow;

  // Reset the form (but not rate-limit tracking, which lives inside the
  // hook across the whole component lifetime) whenever the modal is
  // (re)opened.
  useEffect(() => {
    if (isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (step === STEP_OTP) otpInputRef.current?.focus();
  }, [step]);

  // Focus trap, Escape-to-close, background scroll lock, and focus
  // move-in/restore-on-close, shared with every other dialog in the app
  // (see useModalA11y). Initial focus goes to the phone number field —
  // when the modal (re)opens it's always on the phone step (reset() runs
  // above), so this is a stable, always-present target.
  const dialogRef = useModalA11y({ isOpen, onClose, initialFocusRef: phoneInputRef });

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const result = await sendOtp();
    if (!result || result.code === 'NOOP') return;
    if (result.ok) toast.success(translateOtpResult(t, result));
    else toast.error(translateOtpResult(t, result));
  };

  const handleResend = async () => {
    const result = await resendOtp();
    if (!result || result.code === 'NOOP') return;
    if (result.ok) toast.success(translateOtpResult(t, result));
    else toast.error(translateOtpResult(t, result));
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const result = await verifyOtp();
    if (!result || result.code === 'NOOP') return;
    if (result.ok) toast.success(translateOtpResult(t, result));
    else toast.error(translateOtpResult(t, result));
  };

  return (
    <div
      ref={dialogRef}
      // overflow-y-auto + py-8 (rather than a plain non-scrolling
      // items-center box): on a short viewport with the mobile keyboard
      // open — the OTP step in particular, icon + title + subtitle +
      // label + input + timer + button + resend link all stacked — the
      // centered card can be taller than the visible viewport. Without
      // this the top of the card (including the close button) renders
      // off-screen with no way to scroll to it.
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t('otp.modalAriaLabel', 'Verify your mobile number')}
    >
      <div
        className="relative my-auto w-full max-w-sm animate-fade-up rounded-md border border-advika-border-light bg-white p-6 shadow-advika-modal"
        style={{ borderTop: '4px solid #f97316' }}
      >
        <button
          onClick={onClose}
          aria-label={t('otp.close', 'Close')}
          data-testid="otp-modal-close-button"
          className="absolute top-3 right-3 rounded-lg p-2 text-advika-grey600 transition-colors hover:bg-advika-off-white hover:text-advika-chrome"
        >
          <Icon name="close" size={20} />
        </button>

        {step === STEP_PHONE && (
          <form onSubmit={handleSend} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col items-center text-center gap-2 mb-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-advika-orange">
                <Icon name="call" className="text-white" size={22} />
              </div>
              <h2 className="aa-title-product text-advika-chrome" style={{ fontSize: 20 }}>
                {t('otp.modalTitle', 'Verify your mobile number')}
              </h2>
              <p className="text-[13px] leading-[1.5] text-advika-grey700">
                {t('otp.modalSubtitle', "We'll send a one-time code to confirm it's you before checkout.")}
              </p>
            </div>

            <label className="aa-label text-[9.5px] text-advika-orange-dark" htmlFor="phone-input">
              {t('otp.phoneLabel', 'Phone Number')}
            </label>
            <div className="flex h-[54px] overflow-hidden rounded border-[1.5px] border-advika-orange">
              <span className="aa-mono flex items-center gap-[5px] border-r border-advika-border-light bg-advika-off-white px-[11px] text-[14px] font-semibold">
                <span className="rounded-sm bg-advika-chrome px-1 py-[2px] text-[9px] text-white">IN</span> +91
              </span>
              <input
                id="phone-input"
                ref={phoneInputRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                data-testid="otp-modal-phone-input"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value)}
                className="aa-mono w-full px-3 text-[16px] tracking-[.05em] outline-none"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              data-testid="otp-modal-send-otp-button"
              disabled={!isPhoneValid || isSubmitting || cooldown > 0}
              className="aa-tracking flex h-[54px] items-center justify-center rounded bg-advika-orange text-[14px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? t('otp.sendingOtp', 'Sending OTP…')
                : cooldown > 0
                ? t('otp.tryAgainIn', 'Try again in {{seconds}}s', { seconds: cooldown })
                : t('otp.sendButton', 'Send OTP')}
            </button>
          </form>
        )}

        {step === STEP_OTP && (
          <form onSubmit={handleVerify} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col items-center text-center gap-2 mb-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-advika-orange">
                <Icon name="shield" className="text-white" size={22} />
              </div>
              <h2 className="aa-title-product text-advika-chrome" style={{ fontSize: 20 }}>
                {t('otp.enterOtpTitle', 'Enter OTP')}
              </h2>
              <p className="text-[13px] leading-[1.5] text-advika-grey700">
                {t('otp.sentTo', 'Sent to +91 {{phone}}.', { phone: phoneDigits })}{' '}
                <button
                  type="button"
                  onClick={changeNumber}
                  data-testid="otp-modal-change-number-button"
                  className="font-semibold text-advika-orange"
                  disabled={isSubmitting}
                >
                  {t('otp.change', 'Change')}
                </button>
              </p>
            </div>

            <label className="aa-label text-[9.5px] text-advika-orange-dark" htmlFor="otp-input">
              {t('otp.codeLabel', '6-digit code')}
            </label>
            <input
              id="otp-input"
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              data-testid="otp-modal-otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="aa-mono h-[54px] rounded border-[1.5px] border-advika-orange px-3 text-center text-lg tracking-[0.4em] font-semibold text-advika-chrome outline-none"
              disabled={isSubmitting}
            />

            {isOtpLikelyExpired ? (
              <p className="flex items-center gap-1.5 text-xs text-advika-warning" role="status">
                <Icon name="error" size={15} className="shrink-0" />
                {t('otp.expiredHint', 'This code may have expired. Request a new one.')}
              </p>
            ) : (
              otpSecondsRemaining !== null && (
                <p className="text-xs text-advika-grey600" role="status">
                  {otpSecondsRemaining <= 30 ? (
                    <span className="font-medium text-advika-warning">
                      {t('otp.expiresInSoon', 'Code expires in {{time}}', {
                        time: formatMmSs(otpSecondsRemaining),
                      })}
                    </span>
                  ) : (
                    t('otp.expiresIn', 'Code expires in {{time}}', {
                      time: formatMmSs(otpSecondsRemaining),
                    })
                  )}
                </p>
              )
            )}

            <button
              type="submit"
              data-testid="otp-modal-verify-button"
              disabled={!isOtpValid || isSubmitting}
              className={`aa-tracking flex h-[54px] items-center justify-center rounded text-[14px] font-bold disabled:cursor-not-allowed ${
                isOtpValid ? 'bg-advika-orange text-white disabled:opacity-50' : 'bg-[#e9e7e3] text-advika-grey600'
              }`}
            >
              {isSubmitting
                ? t('otp.verifying', 'Verifying…')
                : t('otp.verifyAndContinue', 'Verify & Continue')}
            </button>

            <button
              type="button"
              onClick={handleResend}
              data-testid="otp-modal-resend-button"
              disabled={cooldown > 0 || isSubmitting}
              className="text-sm text-advika-grey600 transition-colors hover:text-advika-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cooldown > 0
                ? t('otp.resendIn', 'Resend OTP in {{seconds}}s', { seconds: cooldown })
                : t('otp.resend', 'Resend OTP')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

PhoneOtpModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onVerified: PropTypes.func.isRequired,
};
