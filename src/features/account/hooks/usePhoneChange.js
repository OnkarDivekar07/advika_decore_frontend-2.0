// src/features/account/hooks/usePhoneChange.js
//
// Drives the "change my mobile number" flow on the Profile page:
// enter new number -> enter the OTP sent to it -> phone updated.
//
// Deliberately NOT built on top of useOtpFlow (features/auth/hooks) even
// though the shape (phone step -> OTP step, cooldown, expiry countdown)
// is the same: useOtpFlow calls AuthContext's requestOtp/confirmOtp,
// which is the *login* flow — confirming an OTP there logs the caller
// into whichever account that phone belongs to (or creates a new one).
// That's exactly wrong for changing an already-signed-in user's number,
// so this hook calls the dedicated backend endpoints
// (userService.sendPhoneChangeOtp / verifyPhoneChangeOtp — see
// user.routes.js's /phone/send-otp and /phone/verify-otp) instead, which
// update the current user's phone directly rather than authenticating
// anyone. The client-side cooldown/expiry UX mirrors useOtpFlow's so the
// two flows feel identical, without sharing the underlying request.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as userService from '@/services/userService';
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
} from '@/utils/constants';

export const STEP_PHONE = 'phone';
export const STEP_OTP = 'otp';

/**
 * @param {object} [options]
 * @param {(updatedProfile: object) => void} [options.onChanged] - called with the updated profile after a successful verify
 */
export function usePhoneChange({ onChanged } = {}) {
  const [step, setStep] = useState(STEP_PHONE);
  const [phoneDigits, setPhoneDigitsRaw] = useState('');
  const [otp, setOtpRaw] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpSentAt, setOtpSentAt] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const inFlightRef = useRef(false);

  const fullPhone = toE164(phoneDigits);
  const isPhoneValid = isValidIndianMobile(phoneDigits);
  const isOtpValid = validateOtpShape(otp);
  const isOtpLikelyExpired =
    step === STEP_OTP && otpSentAt !== null && nowTick - otpSentAt > OTP_EXPECTED_TTL_MS;
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
      inFlightRef.current = true;
      setIsSubmitting(true);
      try {
        await userService.sendPhoneChangeOtp(fullPhone);
        const sentAt = Date.now();
        setStep(STEP_OTP);
        setOtpSentAt(sentAt);
        setNowTick(sentAt);
        if (isResend) setOtpRaw('');
        setCooldown(RESEND_COOLDOWN_SECONDS);
        return {
          ok: true,
          code: isResend ? 'RESEND_OK' : 'SEND_OK',
          message: isResend ? 'OTP resent to your new number.' : 'OTP sent to your new number.',
        };
      } catch (error) {
        const status = error?.response?.status;
        if (status === 429) {
          setCooldown(60);
          return {
            ok: false,
            code: 'SEND_RATE_LIMIT_SERVER',
            message: 'Too many OTP requests. Please wait a minute and try again.',
            error,
          };
        }
        if (status === 409) {
          return {
            ok: false,
            code: 'PHONE_TAKEN',
            message:
              error.response?.data?.message || 'This mobile number is already in use.',
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
    [isPhoneValid, cooldown, fullPhone]
  );

  const sendOtp = useCallback(() => doSend({ isResend: false }), [doSend]);
  const resendOtp = useCallback(() => doSend({ isResend: true }), [doSend]);

  const verifyOtp = useCallback(async () => {
    if (!isOtpValid || inFlightRef.current) return { ok: false, code: 'NOOP' };

    inFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const updated = await userService.verifyPhoneChangeOtp(fullPhone, otp);
      onChanged?.(updated);
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
        return {
          ok: false,
          code: 'VERIFY_EXPIRED',
          message: 'This code has expired. Please request a new one.',
          error,
        };
      }
      if (status === 409) {
        setStep(STEP_PHONE);
        return {
          ok: false,
          code: 'PHONE_TAKEN',
          message: error.response?.data?.message || 'This mobile number is already in use.',
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
        code: 'VERIFY_INVALID',
        message: error.response?.data?.message || 'Invalid OTP. Please try again.',
        error,
      };
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOtpValid, fullPhone, otp, onChanged]);

  return {
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
  };
}
