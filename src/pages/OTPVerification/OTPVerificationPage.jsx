// src/pages/OTPVerification/OTPVerificationPage.jsx
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPhone, FiShield, FiAlertCircle } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import Spinner from '@/components/Shared/Spinner';
import Seo from '@/components/Shared/Seo';
import { useAuth } from '@/contexts/AuthContext';
import { useOtpFlow, STEP_PHONE, STEP_OTP } from '@/features/auth/hooks/useOtpFlow';
import { translateOtpResult } from '@/features/auth/utils/otpMessages';

const formatMmSs = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function OTPVerificationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const otpInputRef = useRef(null);

  // If something sent the user here (e.g. a protected route), return
  // them there after verifying; otherwise land on the homepage.
  const redirectTo = location.state?.from || '/';

  const flow = useOtpFlow({ onVerified: () => navigate(redirectTo, { replace: true }) });
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
  } = flow;

  // Already signed in? Nothing to do here.
  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (step === STEP_OTP) otpInputRef.current?.focus();
  }, [step]);

  if (isAuthenticated) return null;

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
    <>
      <Navbar />
      <Seo title={t('otp.title', 'Verify Your Phone')} noindex />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20" id="main-content" tabIndex={-1}>
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {step === STEP_PHONE ? (
                <FiPhone className="w-5 h-5 text-primary" />
              ) : (
                <FiShield className="w-5 h-5 text-primary" />
              )}
            </div>
            <h1 className="section-title mb-0">{t('otp.title', 'Verify Your Phone')}</h1>
            <p className="text-gray-500 text-sm">
              {step === STEP_PHONE
                ? t('otp.phoneSubtitle', "We'll send you a one-time code.")
                : t('otp.otpSubtitle', 'Enter the code sent to +91 {{phone}}', { phone: phoneDigits })}
            </p>
          </div>

          {step === STEP_PHONE ? (
            <form onSubmit={handleSend} className="flex flex-col gap-4" noValidate>
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                {t('otp.phoneLabel', 'Phone Number')}
              </label>
              <div className="flex items-center rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-[var(--clr-primary)] overflow-hidden">
                <span className="px-3 py-3 text-sm font-semibold text-gray-500 bg-gray-50 border-r border-gray-200">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder={t('otp.phonePlaceholder', '10-digit mobile number')}
                  data-testid="otp-page-phone-input"
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value)}
                  className="flex-1 px-4 py-3 outline-none"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                data-testid="otp-page-send-otp-button"
                className="btn btn-primary w-full py-3"
                disabled={!isPhoneValid || isSubmitting || cooldown > 0}
              >
                {isSubmitting ? (
                  <Spinner size={20} color="#111" />
                ) : cooldown > 0 ? (
                  t('otp.tryAgainIn', 'Try again in {{seconds}}s', { seconds: cooldown })
                ) : (
                  t('otp.sendButton', 'Send OTP')
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-4" noValidate>
              <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                {t('otp.otpLabel', 'One-Time Code')}
              </label>
              <input
                id="otp"
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('otp.otpPlaceholder', 'Enter 6-digit code')}
                data-testid="otp-page-otp-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-3 tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-[var(--clr-primary)]"
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
                data-testid="otp-page-verify-button"
                className="btn btn-primary w-full py-3"
                disabled={!isOtpValid || isSubmitting}
              >
                {isSubmitting ? <Spinner size={20} color="#111" /> : t('otp.verifyButton', 'Verify')}
              </button>
              <button
                type="button"
                onClick={handleResend}
                data-testid="otp-page-resend-button"
                className="text-sm text-[var(--clr-primary)] disabled:text-gray-500 disabled:cursor-not-allowed self-center"
                disabled={isSubmitting || cooldown > 0}
              >
                {cooldown > 0
                  ? t('otp.resendIn', 'Resend OTP in {{seconds}}s', { seconds: cooldown })
                  : t('otp.resend', 'Resend OTP')}
              </button>
              <button
                type="button"
                onClick={changeNumber}
                data-testid="otp-page-change-number-button"
                className="btn btn-outline w-full"
                disabled={isSubmitting}
              >
                {t('otp.changeNumber', 'Change Number')}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
