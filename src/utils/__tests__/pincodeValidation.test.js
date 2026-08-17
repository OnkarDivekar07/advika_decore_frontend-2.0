import { describe, it, expect } from 'vitest';
import { sanitizePincodeInput, isValidIndianPincode } from '@/utils/pincodeValidation';

describe('sanitizePincodeInput', () => {
  it('strips non-digits and caps at 6 characters', () => {
    expect(sanitizePincodeInput('411-045')).toBe('411045');
    expect(sanitizePincodeInput('4110457890')).toBe('411045');
  });

  it('handles null/undefined gracefully', () => {
    expect(sanitizePincodeInput(null)).toBe('');
    expect(sanitizePincodeInput(undefined)).toBe('');
  });
});

describe('isValidIndianPincode', () => {
  it('accepts a valid 6-digit pincode not starting with 0', () => {
    expect(isValidIndianPincode('411045')).toBe(true);
    expect(isValidIndianPincode('110001')).toBe(true);
  });

  it('rejects a pincode starting with 0', () => {
    expect(isValidIndianPincode('011045')).toBe(false);
  });

  it('rejects pincodes of the wrong length', () => {
    expect(isValidIndianPincode('41104')).toBe(false);
    expect(isValidIndianPincode('4110456')).toBe(false);
  });

  it('rejects non-numeric or empty pincodes', () => {
    expect(isValidIndianPincode('ABCDEF')).toBe(false);
    expect(isValidIndianPincode('')).toBe(false);
    expect(isValidIndianPincode(undefined)).toBe(false);
  });
});
