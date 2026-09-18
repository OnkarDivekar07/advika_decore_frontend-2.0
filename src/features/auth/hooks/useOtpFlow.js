// src/features/auth/hooks/useOtpFlow.js
//
// One implementation of the phone -> OTP flow, shared by both places it
// appears in the UI (PhoneOtpModal for the checkout gate, and
// OTPVerificationPage for the standalone /otp-verification route) so
// resend cooldowns, attempt limits, and error handling behave
// identically everywhere rather than drifting between two copies.
//
// The backend enforces the real limits (5 sends/60s, 5 verifies/300s per
// phone — src/middlewares/rateLimiter.js) and returns a plain 429 with no
// Retry-After header. This hook mirrors those limits client-side purely
// for UX: pre-emptively disabling actions and showing an accurate
// countdown instead of firing a request that's guaranteed to 429. The
// backend remains the actual enforcement point.
//
// This hook is deliberately i18n-agnostic: outcomes are reported as a
// `code` (+ any interpolation data like `seconds`), not English text, so
// each screen can translate them and stay consistent with the rest of
// the app's multilingual support. `message` is included as a plain-
// English fallback only, for the very small chance a screen doesn't map
// a given code.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  isValidIndianMobile,
  isValidOtp as validateOtpShape,
  sanitizeOtpInput,
  sanitizePhoneInput,
  toE164,
} from '@/utils/phoneValidation';
import {
  OTP_EXPECTED_TTL_MS,
  RESEND_COOLDOWN_SECONDS,
  SEND_OTP_MAX_ATTEMPTS,
  SEND_OTP_WINDOW_MS,
  VERIFY_OTP_MAX_ATTEMPTS,
  VERIFY_OTP_WINDOW_MS,
} from '@/utils/constants';

export const STEP_PHONE = 'phone';
export const STEP_OTP = 'otp';

// Sliding-window counter, mirroring the backend's own per-phone limiter.
function checkAndRecordAttempt(attemptsRef, phone, maxAttempts, windowMs) {
  const now = Date.now();
  const record = attemptsRef.current.get(phone);

  if (!record || now - record.windowStart >= windowMs) {
    attemptsRef.current.set(phone, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }
  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count, retryAfterSeconds: 0 };
}

/**
 * @param {object} [options]
 * @param {() => void} [options.onVerified] - called after a successful verify
 */
export function useOtpFlow({ onVerified } = {}) {
  const { requestOtp, confirmOtp } = useAuth();

  const [step, setStep] = useState(STEP_PHONE);
  const [phoneDigits, setPhoneDigitsRaw] = useState('');
  const [otp, setOtpRaw] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpSentAt, setOtpSentAt] = useState(null);
  // Ticks once a second while on the OTP step so the expiry countdown
  // (and isOtpLikelyExpired) stay live instead of only updating on the
  // next unrelated re-render (e.g. a keystroke).
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Per-phone attempt tracking, kept in refs (not state) so it survives
  // a step reset and isn't itself a re-render dependency.
  const sendAttemptsRef = useRef(new Map());
  const verifyAttemptsRef = useRef(new Map());
  // Guards against a second submit landing while one is already
  // in-flight (belt-and-suspenders alongside apiClient's own
  // request de-duplication).
  const inFlightRef = useRef(false);

  const fullPhone = toE164(phoneDigits);
  const isPhoneValid = isValidIndianMobile(phoneDigits);
  const isOtpValid = validateOtpShape(otp);
  const isOtpLikelyExpired =
    step === STEP_OTP && otpSentAt !== null && nowTick - otpSentAt > OTP_EXPECTED_TTL_MS;
  // Seconds left before the OTP is expected to expire, clamped to 0 and
  // null when there's nothing to count down (no OTP step / not sent yet).
  const otpSecondsRemaining =
    step === STEP_OTP && otpSentAt !== null
      ? Math.max(0, Math.ceil((otpSentAt + OTP_EXPECTED_TTL_MS - nowTick) / 1000))
      : null;

  const setPhoneDigits = useCallback((raw) => {
    setPhoneDigitsRaw(sanitizePhoneInput(raw));
  }, []);

  const setOtp = useCallback((raw) => {
    setOtpRaw(sanitizeOtpInput(raw));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Drives isOtpLikelyExpired / otpSecondsRemaining. Only runs on the OTP
  // step, and stops itself once expiry has passed rather than ticking
  // forever in the background.
  useEffect(() => {
    if (step !== STEP_OTP || otpSentAt === null) return undefined;
    if (Date.now() - otpSentAt > OTP_EXPECTED_TTL_MS) return undefined;

    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step, otpSentAt]);

  const reset = useCallback(() => {
    setStep(STEP_PHONE);
    setPhoneDigitsRaw('');
    setOtpRaw('');
    setIsSubmitting(false);
    setCooldown(0);
    setOtpSentAt(null);
  }, []);

  const changeNumber = useCallback(() => {
    setStep(STEP_PHONE);
    setOtpRaw('');
    setOtpSentAt(null);
  }, []);

  const doSend = useCallback(
    async ({ isResend }) => {
      if (!isPhoneValid || inFlightRef.current || cooldown > 0) {
        return { ok: false, code: 'NOOP' };
      }

      const { allowed, retryAfterSeconds } = checkAndRecordAttempt(
        sendAttemptsRef,
        fullPhone,
        SEND_OTP_MAX_ATTEMPTS,
        SEND_OTP_WINDOW_MS
      );
      if (!allowed) {
        setCooldown(retryAfterSeconds);
        return {
          ok: false,
          code: 'SEND_RATE_LIMIT_LOCAL',
          seconds: retryAfterSeconds,
          message: `Too many OTP requests for this number. Try again in ${retryAfterSeconds}s.`,
        };
      }

      inFlightRef.current = true;
      setIsSubmitting(true);
      try {
        await requestOtp(fullPhone);
        const sentAt = Date.now();
        setStep(STEP_OTP);
        setOtpSentAt(sentAt);
        setNowTick(sentAt);
        if (isResend) setOtpRaw('');
        setCooldown(RESEND_COOLDOWN_SECONDS);
        return {
          ok: true,
          code: isResend ? 'RESEND_OK' : 'SEND_OK',
          message: isResend ? 'OTP resent to your phone.' : 'OTP sent to your phone.',
        };
      } catch (error) {
        if (error?.response?.status === 429) {
          setCooldown(60);
          return {
            ok: false,
            code: 'SEND_RATE_LIMIT_SERVER',
            message: 'Too many OTP requests. Please wait a minute and try again.',
            error,
          };
        }
        if (!error?.response) {
          return {
            ok: false,
            code: 'NETWORK_ERROR',
            message: 'Network error. Check your connection and try again.',
            error,
          };
        }
        return {
          ok: false,
          code: 'SEND_GENERIC_ERROR',
          message: error.response?.data?.message || 'Could not send OTP. Please try again.',
          error,
        };
      } finally {
        inFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [isPhoneValid, cooldown, fullPhone, requestOtp]
  );

  const sendOtp = useCallback(() => doSend({ isResend: false }), [doSend]);
  const resendOtp = useCallback(() => doSend({ isResend: true }), [doSend]);

  const verifyOtp = useCallback(async () => {
    if (!isOtpValid || inFlightRef.current) return { ok: false, code: 'NOOP' };

    const { allowed, remaining, retryAfterSeconds } = checkAndRecordAttempt(
      verifyAttemptsRef,
      fullPhone,
      VERIFY_OTP_MAX_ATTEMPTS,
      VERIFY_OTP_WINDOW_MS
    );
    if (!allowed) {
      setStep(STEP_PHONE);
      setCooldown(retryAfterSeconds);
      return {
        ok: false,
        code: 'VERIFY_RATE_LIMIT_LOCAL',
        seconds: retryAfterSeconds,
        message: `Too many incorrect attempts. Request a new OTP in ${retryAfterSeconds}s.`,
      };
    }

    inFlightRef.current = true;
    setIsSubmitting(true);
    try {
      await confirmOtp(fullPhone, otp);
      onVerified?.();
      return { ok: true, code: 'VERIFY_OK' };
    } catch (error) {
      setOtpRaw('');
      const status = error?.response?.status;

      if (status === 429) {
        setStep(STEP_PHONE);
        setCooldown(60);
        return {
          ok: false,
          code: 'VERIFY_RATE_LIMIT_SERVER',
          message: 'Too many attempts. Please request a new OTP.',
          error,
        };
      }
      if (status === 404) {
        // Backend returns 404 specifically for "OTP not found or expired".
        if (remaining === 0) setStep(STEP_PHONE);
        return {
          ok: false,
          code: 'VERIFY_EXPIRED',
          message: 'This code has expired. Please request a new one.',
          error,
        };
      }
      if (!error?.response) {
        return {
          ok: false,
          code: 'NETWORK_ERROR',
          message: 'Network error. Check your connection and try again.',
          error,
        };
      }
      // Local counter exhausted (even though backend hasn't 429'd yet) —
      // send them back for a fresh code rather than let them keep
      // guessing against the same one.
      if (remaining === 0) setStep(STEP_PHONE);
      return {
        ok: false,
        code: 'VERIFY_INVALID',
        message: error.response?.data?.message || 'Invalid OTP. Please try again.',
        error,
      };
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOtpValid, fullPhone, otp, confirmOtp, onVerified]);

  return {
    step,
    phoneDigits,
    setPhoneDigits,
    otp,
    setOtp,
    fullPhone,
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
  };
}
