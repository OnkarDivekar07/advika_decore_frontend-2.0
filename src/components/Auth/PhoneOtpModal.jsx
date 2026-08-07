// src/components/Auth/PhoneOtpModal.jsx
//
// Two-step "verify to continue" modal: enter mobile number -> enter the
// OTP sent to it. This is the ONLY place in the app that asks for a
// phone number — it only ever appears because something requiring an
// identity (checkout) called `requireAuth()`.
//
// Rate limiting: the backend enforces 5 sends/60s and 5 verify
// attempts/300s per phone (src/middlewares/rateLimiter.js) and returns a
// plain 429 with no Retry-After header. We mirror the same limits
// client-side so the UI can pre-emptively disable the button and show an
// accurate countdown instead of firing a request that's guaranteed to
// 429 — the backend is still the real enforcement point, this is purely
// UX. Attempt counters live in refs (not component state) so they
// survive the form-reset that happens each time the modal reopens.
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { FiX, FiPhone, FiShield } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { PHONE_REGEX, OTP_LENGTH } from '@/utils/constants';
import { handleError } from '@/utils/errorHandler';

const SEND_OTP_MAX_ATTEMPTS = 5;
const SEND_OTP_WINDOW_MS = 60 * 1000;
const VERIFY_OTP_MAX_ATTEMPTS = 5;
const VERIFY_OTP_WINDOW_MS = 5 * 60 * 1000;

// Mirrors the backend's sliding-window counter for one phone number.
// Returns whether this attempt is allowed, and (if not) how long until
// the window resets.
function checkAndRecordAttempt(attemptsRef, phone, maxAttempts, windowMs) {
  const now = Date.now();
  const record = attemptsRef.current.get(phone);

  if (!record || now - record.windowStart >= windowMs) {
    attemptsRef.current.set(phone, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  record.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export default function PhoneOtpModal({ isOpen, onClose, onVerified }) {
  const { requestOtp, confirmOtp } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpInputRef = useRef(null);
  // Per-phone attempt tracking, deliberately NOT reset by the
  // on-open-reset effect below — it needs to persist across the modal
  // being closed and reopened for the same number.
  const sendAttemptsRef = useRef(new Map());
  const verifyAttemptsRef = useRef(new Map());

  // Reset the form (but not rate-limit tracking) whenever the modal is
  // (re)opened.
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhoneDigits('');
      setOtp('');
      setIsSubmitting(false);
      setCooldown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const fullPhone = `+91${phoneDigits}`;
  const isPhoneValid = PHONE_REGEX.test(fullPhone);
  const isOtpValid = otp.length === OTP_LENGTH;

  const sendOtp = async () => {
    if (!isPhoneValid || isSubmitting || cooldown > 0) return;

    const { allowed, retryAfterSeconds } = checkAndRecordAttempt(
      sendAttemptsRef,
      fullPhone,
      SEND_OTP_MAX_ATTEMPTS,
      SEND_OTP_WINDOW_MS
    );
    if (!allowed) {
      toast.error(`Too many OTP requests. Try again in ${retryAfterSeconds}s.`);
      setCooldown(retryAfterSeconds);
      return;
    }

    setIsSubmitting(true);
    try {
      await requestOtp(fullPhone);
      toast.success('OTP sent to your mobile number');
      setStep('otp');
      setCooldown(60); // matches the backend's own send window
    } catch (error) {
      if (error?.response?.status === 429) {
        toast.error('Too many OTP requests. Please wait a minute and try again.');
        setCooldown(60);
      } else {
        handleError(error, 'Could not send OTP. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!isOtpValid || isSubmitting) return;

    const { allowed, retryAfterSeconds } = checkAndRecordAttempt(
      verifyAttemptsRef,
      fullPhone,
      VERIFY_OTP_MAX_ATTEMPTS,
      VERIFY_OTP_WINDOW_MS
    );
    if (!allowed) {
      toast.error(
        `Too many attempts on this code. Request a new OTP in ${retryAfterSeconds}s.`
      );
      setStep('phone');
      setCooldown(retryAfterSeconds);
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmOtp(fullPhone, otp);
      toast.success('Mobile number verified');
      onVerified();
    } catch (error) {
      if (error?.response?.status === 429) {
        toast.error('Too many attempts. Please request a new OTP.');
        setStep('phone');
        setCooldown(60);
      } else {
        handleError(error, 'Invalid or expired OTP.');
        setOtp('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Verify your mobile number"
    >
      <div className="card w-full max-w-sm p-6 relative animate-fade-up">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>

        {step === 'phone' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendOtp();
            }}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="flex flex-col items-center text-center gap-2 mb-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FiPhone className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-gray-900">
                Verify your mobile number
              </h2>
              <p className="text-sm text-gray-500">
                We'll send a one-time code to confirm it's you before checkout.
              </p>
            </div>

            <label className="text-sm font-semibold text-gray-700" htmlFor="phone-input">
              Mobile number
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
                onChange={(e) =>
                  setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                className="flex-1 px-3 py-3 text-sm outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!isPhoneValid || isSubmitting || cooldown > 0}
              className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Sending OTP…'
                : cooldown > 0
                ? `Try again in ${cooldown}s`
                : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col items-center text-center gap-2 mb-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FiShield className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-gray-900">Enter OTP</h2>
              <p className="text-sm text-gray-500">
                Sent to +91 {phoneDigits}.{' '}
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-primary font-medium underline underline-offset-2"
                >
                  Change
                </button>
              </p>
            </div>

            <label className="text-sm font-semibold text-gray-700" htmlFor="otp-input">
              6-digit code
            </label>
            <input
              id="otp-input"
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              className="rounded-lg border-2 border-gray-200 focus:border-primary outline-none px-3 py-3 text-center text-lg tracking-[0.4em] font-semibold"
            />

            <button
              type="submit"
              disabled={!isOtpValid || isSubmitting}
              className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Verifying…' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              onClick={sendOtp}
              disabled={cooldown > 0 || isSubmitting}
              className="text-sm text-gray-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
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
