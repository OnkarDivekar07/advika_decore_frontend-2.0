// src/components/Account/MobileNumberChange.jsx
//
// Inline, two-step (new number -> OTP) widget for changing the signed-in
// user's mobile number. Visual shape mirrors PhoneOtpModal's login flow
// (same input styling, cooldown/expiry countdown) but drives
// usePhoneChange, not useOtpFlow — see that hook's header comment for why
// they can't share the same request.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiLoader } from 'react-icons/fi';
import Icon from '@/components/Shared/Icon';
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
    'w-full h-11 rounded border border-advika-border-light px-3 text-[14.5px] text-advika-chrome focus:border-advika-orange focus:outline-none';

  return (
    <div className="rounded border border-advika-border-light p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold text-advika-chrome flex items-center gap-2">
          <Icon name="call" size={16} className="text-advika-orange" />
          {t('account.changeMobileNumber', 'Change Mobile Number')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('buttons.close', 'Close')}
          className="p-1 text-advika-grey600 hover:text-advika-grey800"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <p className="text-[12px] text-advika-grey700 mb-3">
        {t('account.currentNumber', 'Current number: {{phone}}', {
          phone: `+91 ${currentPhone}`,
        })}
      </p>

      {step !== STEP_OTP ? (
        <form onSubmit={handleSend} className="flex flex-col gap-3">
          <label htmlFor="new-phone" className="aa-label text-[9px] font-semibold text-advika-grey600">
            {t('account.newMobileNumber', 'New mobile number')}
          </label>
          <div className="flex items-center gap-2">
            <span className="flex h-11 shrink-0 items-center rounded border border-advika-border-light bg-advika-off-white px-3 text-[14.5px] text-advika-grey700">
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
            <p
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`text-[12px] ${feedback.type === 'error' ? 'text-advika-danger' : 'text-advika-grey700'}`}
            >
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!isPhoneValid || isSubmitting || cooldown > 0}
            className="h-11 w-full rounded bg-advika-orange text-[13px] font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <FiLoader className="mx-auto w-4 h-4 animate-spin" aria-hidden />
            ) : (
              t('account.sendOtp', 'Send OTP')
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <label htmlFor="phone-otp" className="aa-label text-[9px] font-semibold text-advika-grey600">
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
            <p className="text-[12px] text-advika-warning" role="status">
              {t('account.otpExpired', 'This OTP may have expired. Request a new one.')}
            </p>
          )}

          {feedback && (
            <p
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`text-[12px] ${feedback.type === 'error' ? 'text-advika-danger' : 'text-advika-grey700'}`}
            >
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!isOtpValid || isSubmitting}
            className="h-11 w-full rounded bg-advika-orange text-[13px] font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <FiLoader className="mx-auto w-4 h-4 animate-spin" aria-hidden />
            ) : (
              t('account.verifyAndUpdate', 'Verify & Update')
            )}
          </button>

          <div className="flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={changeNumber}
              className="text-advika-grey700 hover:text-advika-grey900 underline"
            >
              {t('account.editNumber', 'Edit number')}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isSubmitting}
              className="font-semibold text-advika-orange-dark hover:underline disabled:text-advika-grey600 disabled:no-underline"
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
