import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/apiClient', () => ({
  default: { post: vi.fn() },
}));

import apiClient from '@/utils/apiClient';
import { sendOtp, verifyOtp } from '@/services/authService';

beforeEach(() => {
  apiClient.post.mockReset();
});

describe('sendOtp', () => {
  it('converts the bare local digits to E.164 before sending', async () => {
    apiClient.post.mockResolvedValue({ data: { message: 'OTP sent' } });
    const result = await sendOtp('9876543210');
    expect(apiClient.post).toHaveBeenCalledWith('/api/otp/send-otp', { phone: '+919876543210' });
    expect(result).toEqual({ message: 'OTP sent' });
  });
});

describe('verifyOtp', () => {
  it('sends the E.164 phone and the raw OTP, returning the auth payload', async () => {
    apiClient.post.mockResolvedValue({
      data: { data: { token: 'jwt-token', user: { id: 'u1', phone: '+919876543210' } } },
    });
    const result = await verifyOtp('9876543210', '123456');
    expect(apiClient.post).toHaveBeenCalledWith('/api/otp/verify-otp', {
      phone: '+919876543210',
      otp: '123456',
    });
    expect(result).toEqual({ token: 'jwt-token', user: { id: 'u1', phone: '+919876543210' } });
  });

  it('propagates a rejected verification (wrong/expired code) to the caller', async () => {
    const error = { response: { status: 400, data: { message: 'Invalid OTP' } } };
    apiClient.post.mockRejectedValue(error);
    await expect(verifyOtp('9876543210', '000000')).rejects.toBe(error);
  });
});
