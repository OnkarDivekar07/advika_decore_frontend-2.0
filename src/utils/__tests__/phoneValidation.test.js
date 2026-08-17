import { describe, it, expect } from 'vitest';
import {
  sanitizePhoneInput,
  isValidIndianMobile,
  toE164,
  fromE164,
  maskPhone,
  isValidOtp,
  sanitizeOtpInput,
} from '@/utils/phoneValidation';

describe('sanitizePhoneInput', () => {
  it('strips non-digit characters', () => {
    expect(sanitizePhoneInput('98765-43210')).toBe('9876543210');
    expect(sanitizePhoneInput('(987) 654 3210')).toBe('9876543210');
  });

  it('keeps the last 10 digits when more are pasted (e.g. with country code)', () => {
    expect(sanitizePhoneInput('+919876543210')).toBe('9876543210');
    expect(sanitizePhoneInput('919876543210')).toBe('9876543210');
  });

  it('handles a leading 0 the same way (keeps the last 10 digits)', () => {
    expect(sanitizePhoneInput('09876543210')).toBe('9876543210');
  });

  it('returns an empty string for null/undefined/non-numeric input', () => {
    expect(sanitizePhoneInput(null)).toBe('');
    expect(sanitizePhoneInput(undefined)).toBe('');
    expect(sanitizePhoneInput('abc')).toBe('');
  });

  it('does not pad short input', () => {
    expect(sanitizePhoneInput('987')).toBe('987');
  });
});

describe('isValidIndianMobile', () => {
  it('accepts a valid 10-digit number starting 6-9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('6000000000')).toBe(true);
  });

  it('rejects numbers starting 0-5 (not a valid TRAI mobile prefix)', () => {
    expect(isValidIndianMobile('5876543210')).toBe(false);
    expect(isValidIndianMobile('0876543210')).toBe(false);
  });

  it('rejects numbers that are too short or too long', () => {
    expect(isValidIndianMobile('987654321')).toBe(false);
    expect(isValidIndianMobile('98765432100')).toBe(false);
  });

  it('rejects non-numeric or empty input', () => {
    expect(isValidIndianMobile('abcdefghij')).toBe(false);
    expect(isValidIndianMobile('')).toBe(false);
  });
});

describe('toE164 / fromE164', () => {
  it('round-trips a local number through E.164', () => {
    expect(toE164('9876543210')).toBe('+919876543210');
    expect(fromE164('+919876543210')).toBe('9876543210');
  });

  it('fromE164 tolerates a missing + or missing 91 prefix', () => {
    expect(fromE164('919876543210')).toBe('9876543210');
    expect(fromE164('9876543210')).toBe('9876543210');
  });

  it('fromE164 handles empty/garbage input without throwing', () => {
    expect(fromE164(undefined)).toBe('');
    expect(fromE164('not-a-phone')).toBe('');
  });
});

describe('maskPhone', () => {
  it('masks all but the last two digits', () => {
    expect(maskPhone('9876543210')).toBe('••••••••10');
  });

  it('returns the input unmasked for very short values', () => {
    expect(maskPhone('9')).toBe('9');
    expect(maskPhone('')).toBe('');
  });
});

describe('OTP helpers', () => {
  it('validates a 6-digit numeric OTP only', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('1234567')).toBe(false);
    expect(isValidOtp('12a456')).toBe(false);
  });

  it('sanitizes OTP input to digits only, capped at 6 characters', () => {
    expect(sanitizeOtpInput('1a2b3c4d5e6f7g')).toBe('123456');
    expect(sanitizeOtpInput('12-34')).toBe('1234');
  });
});
