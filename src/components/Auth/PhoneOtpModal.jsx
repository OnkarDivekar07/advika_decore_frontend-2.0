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
// OTPVerificationPage, so both surfaces behave identically.
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { FiX, FiPhone, FiShield, FiAlertCircle } from 'react-icons/fi';
import { useOtpFlow, STEP_PHONE, STEP_OTP } from '@/features/auth/hooks/useOtpFlow';
import { translateOtpResult } from '@/features/auth/utils/otpMessages';

const formatMmSs = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function PhoneOtpModal({ isOpen, onClose, onVerified }) {
  const { t } = useTranslation();
  const otpInputRef = useRef(null);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('otp.modalAriaLabel', 'Verify your mobile number')}
    >
      <div className="card w-full max-w-sm p-6 relative animate-fade-up">
        <button
          onClick={onClose}
          aria-label={t('otp.close', 'Close')}
          className="absolute top-3 right-3 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>

        {step === STEP_PHONE && (
          <form onSubmit={handleSend} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col items-center text-center gap-2 mb-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FiPhone className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-gray-900">
                {t('otp.modalTitle', 'Verify your mobile number')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('otp.modalSubtitle', "We'll send a one-time code to confirm it's you before checkout.")}
              </p>
            </div>

            <label className="text-sm font-semibold text-gray-700" htmlFor="phone-input">
              {t('otp.phoneLabel', 'Phone Number')}
            </label>
            <div className="flex items-center rounded-lg border-2 border-gray-200 focus-within:border-primary overflow-hidden">
              <span className="px-3 py-3 text-sm font-semibold text-gray-500 bg-gray-50 border-r border-gray-200">
                +91
              </span>
              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value)}
                className="flex-1 px-3 py-3 text-sm outline-none"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={!isPhoneValid || isSubmitting || cooldown > 0}
              className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FiShield className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-gray-900">
                {t('otp.enterOtpTitle', 'Enter OTP')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('otp.sentTo', 'Sent to +91 {{phone}}.', { phone: phoneDigits })}{' '}
                <button
                  type="button"
                  onClick={changeNumber}
                  className="text-primary font-medium underline underline-offset-2"
                  disabled={isSubmitting}
                >
                  {t('otp.change', 'Change')}
                </button>
              </p>
            </div>

            <label className="text-sm font-semibold text-gray-700" htmlFor="otp-input">
              {t('otp.codeLabel', '6-digit code')}
            </label>
            <input
              id="otp-input"
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="rounded-lg border-2 border-gray-200 focus:border-primary outline-none px-3 py-3 text-center text-lg tracking-[0.4em] font-semibold"
              disabled={isSubmitting}
            />

            {isOtpLikelyExpired ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-600" role="status">
                <FiAlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {t('otp.expiredHint', 'This code may have expired. Request a new one.')}
              </p>
            ) : (
              otpSecondsRemaining !== null && (
                <p className="text-xs text-gray-500" role="status">
                  {otpSecondsRemaining <= 30 ? (
                    <span className="text-amber-600 font-medium">
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
              disabled={!isOtpValid || isSubmitting}
              className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? t('otp.verifying', 'Verifying…')
                : t('otp.verifyAndContinue', 'Verify & Continue')}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isSubmitting}
              className="text-sm text-gray-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
