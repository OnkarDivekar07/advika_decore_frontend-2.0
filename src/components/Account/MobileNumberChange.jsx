// src/components/Account/MobileNumberChange.jsx
//
// Inline, two-step (new number -> OTP) widget for changing the signed-in
// user's mobile number. Visual shape mirrors PhoneOtpModal's login flow
// (same input styling, cooldown/expiry countdown) but drives
// usePhoneChange, not useOtpFlow — see that hook's header comment for why
// they can't share the same request.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiLoader, FiPhone, FiX } from 'react-icons/fi';
import { usePhoneChange, STEP_OTP } from '@/features/account/hooks/usePhoneChange';
import { OTP_LENGTH } from '@/utils/phoneValidation';

export default function MobileNumberChange({ currentPhone, onChanged, onClose }) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState(null); // { type: 'error'|'info', text }

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
    sendOtp,
    resendOtp,
    verifyOtp,
    changeNumber,
  } = usePhoneChange({
    onChanged: (updated) => {
      onChanged?.(updated);
      setFeedback(null);
      onClose?.();
    },
  });

  const handleSend = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const result = await sendOtp();
    if (!result.ok && result.message) setFeedback({ type: 'error', text: result.message });
  };

  const handleResend = async () => {
    setFeedback(null);
    const result = await resendOtp();
    setFeedback(
      result.ok ? { type: 'info', text: result.message } : { type: 'error', text: result.message }
    );
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const result = await verifyOtp();
    if (!result.ok && result.message) setFeedback({ type: 'error', text: result.message });
  };

  const inputClass =
    'w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clr-primary)]/40 border-gray-300';

  return (
    <div className="card p-4 sm:p-5 mt-3 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <FiPhone className="w-4 h-4" aria-hidden />
          {t('account.changeMobileNumber', 'Change Mobile Number')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('buttons.close', 'Close')}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {t('account.currentNumber', 'Current number: {{phone}}', {
          phone: `+91 ${currentPhone}`,
        })}
      </p>

      {step !== STEP_OTP ? (
        <form onSubmit={handleSend} className="flex flex-col gap-3">
          <label htmlFor="new-phone" className="text-xs font-medium text-gray-600">
            {t('account.newMobileNumber', 'New mobile number')}
          </label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2.5 rounded-lg bg-gray-100 text-sm text-gray-600 shrink-0">
              +91
            </span>
            <input
              id="new-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={t('account.phonePlaceholder', '10-digit mobile number')}
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value)}
              className={inputClass}
              maxLength={10}
            />
          </div>

          {feedback && (
            <p className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!isPhoneValid || isSubmitting || cooldown > 0}
            className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <FiLoader className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              t('account.sendOtp', 'Send OTP')
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <label htmlFor="phone-otp" className="text-xs font-medium text-gray-600">
            {t('account.enterOtp', 'Enter the OTP sent to +91 {{phone}}', { phone: phoneDigits })}
          </label>
          <input
            id="phone-otp"
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t('account.otpPlaceholder', '6-digit OTP')}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className={inputClass}
            maxLength={OTP_LENGTH}
          />

          {isOtpLikelyExpired && (
            <p className="text-xs text-amber-600">
              {t('account.otpExpired', 'This OTP may have expired. Request a new one.')}
            </p>
          )}

          {feedback && (
            <p className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!isOtpValid || isSubmitting}
            className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <FiLoader className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              t('account.verifyAndUpdate', 'Verify & Update')
            )}
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={changeNumber}
              className="text-gray-500 hover:text-gray-700 underline"
            >
              {t('account.editNumber', 'Edit number')}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isSubmitting}
              className="text-[var(--clr-primary-dark)] hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {cooldown > 0
                ? t('account.resendIn', 'Resend in {{count}}s', { count: cooldown })
                : t('account.resendOtp', 'Resend OTP')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
