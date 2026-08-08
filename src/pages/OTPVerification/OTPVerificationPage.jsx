// src/pages/OTPVerification/OTPVerificationPage.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar/Navbar';
import Spinner from '@/components/Shared/Spinner';
import { AuthContext } from '@/contexts/AuthContext';
import { sendOtp, verifyOtp } from '@/services/authService';
import { handleError } from '@/utils/errorHandler';
import { toast } from 'react-toastify';

const STEP_PHONE = 'phone';
const STEP_OTP = 'otp';

// Backend allows 5 send-otp requests per phone per 60s window
// (see otp-send-limit in rateLimiter.js). Cooldown is kept a bit under
// that so a resend never races the server-side limiter unnecessarily.
const RESEND_COOLDOWN_SECONDS = 30;

export default function OTPVerificationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [step, setStep] = useState(STEP_PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimerRef = useRef(null);

  const isValidPhone = /^\d{10}$/.test(phone);
  // Backend always generates and expects exactly 6 digits (see otp.service.js
  // and otp.validation.js) — 4-5 digit codes would pass this check but
  // always be rejected by the API, so match the server exactly.
  const isValidOtp = /^\d{6}$/.test(otp);

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      clearInterval(cooldownTimerRef.current);
      return;
    }
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(cooldownTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendCooldown > 0]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!isValidPhone || resendCooldown > 0) return;

    setLoading(true);
    try {
      await sendOtp(phone);
      toast.success(t('otp.sent', 'OTP sent to your phone.'));
      setStep(STEP_OTP);
      startResendCooldown();
    } catch (error) {
      handleError(error, t('otp.sendFailed', 'Could not send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      await sendOtp(phone);
      toast.success(t('otp.resent', 'OTP resent to your phone.'));
      setOtp('');
      startResendCooldown();
    } catch (error) {
      handleError(error, t('otp.sendFailed', 'Could not send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!isValidOtp) return;

    setLoading(true);
    try {
      const { token } = await verifyOtp(phone, otp);
      login(token);
      toast.success(t('otp.verified', 'Verified successfully.'));
      navigate('/');
    } catch (error) {
      handleError(error, t('otp.verifyFailed', 'Invalid or expired OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep(STEP_PHONE);
    setOtp('');
    setResendCooldown(0);
    clearInterval(cooldownTimerRef.current);
  };

  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="section-title mb-2">
          {t('otp.title', 'Verify Your Phone')}
        </h1>
        <p className="text-gray-500 mb-8">
          {step === STEP_PHONE
            ? t('otp.phoneSubtitle', "We'll send you a one-time code.")
            : t('otp.otpSubtitle', 'Enter the code sent to {{phone}}', { phone })}
        </p>

        {step === STEP_PHONE ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4" noValidate>
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              {t('otp.phoneLabel', 'Phone Number')}
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={t('otp.phonePlaceholder', '10-digit mobile number')}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--clr-primary)]"
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!isValidPhone || loading}
            >
              {loading ? <Spinner size={20} color="#111" /> : t('otp.sendButton', 'Send OTP')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4" noValidate>
            <label htmlFor="otp" className="text-sm font-medium text-gray-700">
              {t('otp.otpLabel', 'One-Time Code')}
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t('otp.otpPlaceholder', 'Enter 6-digit code')}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="border border-gray-300 rounded-lg px-4 py-3 tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-[var(--clr-primary)]"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!isValidOtp || loading}
            >
              {loading ? <Spinner size={20} color="#111" /> : t('otp.verifyButton', 'Verify')}
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-sm text-[var(--clr-primary)] disabled:text-gray-400 disabled:cursor-not-allowed self-center"
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? t('otp.resendIn', 'Resend OTP in {{seconds}}s', { seconds: resendCooldown })
                : t('otp.resend', 'Resend OTP')}
            </button>
            <button
              type="button"
              onClick={handleChangeNumber}
              className="btn btn-outline w-full"
              disabled={loading}
            >
              {t('otp.changeNumber', 'Change Number')}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
