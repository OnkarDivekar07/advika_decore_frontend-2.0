import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';
import { useOtpFlow, STEP_PHONE, STEP_OTP } from '@/features/auth/hooks/useOtpFlow';

const VALID_PHONE = '9876543210';
const VALID_OTP = '123456';

function makeAuth({ requestOtp, confirmOtp } = {}) {
  return {
    requestOtp: requestOtp ?? vi.fn().mockResolvedValue({ message: 'sent' }),
    confirmOtp: confirmOtp ?? vi.fn().mockResolvedValue({ id: 'u1' }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('phone step validation', () => {
  it('reports the phone invalid until a valid 10-digit Indian mobile is entered', () => {
    useAuth.mockReturnValue(makeAuth());
    const { result } = renderHook(() => useOtpFlow());

    expect(result.current.isPhoneValid).toBe(false);
    act(() => result.current.setPhoneDigits('12345'));
    expect(result.current.isPhoneValid).toBe(false);
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    expect(result.current.isPhoneValid).toBe(true);
  });

  it('sanitizes non-digit characters as they are typed', () => {
    useAuth.mockReturnValue(makeAuth());
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits('98765-43210'));
    expect(result.current.phoneDigits).toBe('9876543210');
  });
});

describe('sendOtp (happy path)', () => {
  it('moves to the OTP step and starts the resend cooldown on success', async () => {
    const requestOtp = vi.fn().mockResolvedValue({ message: 'sent' });
    useAuth.mockReturnValue(makeAuth({ requestOtp }));
    const { result } = renderHook(() => useOtpFlow());

    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      const outcome = await result.current.sendOtp();
      expect(outcome.ok).toBe(true);
      expect(outcome.code).toBe('SEND_OK');
    });

    expect(requestOtp).toHaveBeenCalledWith('+919876543210');
    expect(result.current.step).toBe(STEP_OTP);
    expect(result.current.cooldown).toBe(45);
  });

  it('is a no-op while the phone is invalid', async () => {
    const requestOtp = vi.fn();
    useAuth.mockReturnValue(makeAuth({ requestOtp }));
    const { result } = renderHook(() => useOtpFlow());

    await act(async () => {
      const outcome = await result.current.sendOtp();
      expect(outcome).toEqual({ ok: false, code: 'NOOP' });
    });
    expect(requestOtp).not.toHaveBeenCalled();
  });
});

describe('sendOtp (validation / API failures)', () => {
  it('surfaces a server 429 as a rate-limit error and starts a cooldown', async () => {
    const error = { response: { status: 429 } };
    const requestOtp = vi.fn().mockRejectedValue(error);
    useAuth.mockReturnValue(makeAuth({ requestOtp }));
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));

    await act(async () => {
      const outcome = await result.current.sendOtp();
      expect(outcome.ok).toBe(false);
      expect(outcome.code).toBe('SEND_RATE_LIMIT_SERVER');
    });
    expect(result.current.cooldown).toBe(60);
    expect(result.current.step).toBe(STEP_PHONE); // never advanced
  });

  it('surfaces a network error (no response) distinctly', async () => {
    const requestOtp = vi.fn().mockRejectedValue(new Error('Network Error'));
    useAuth.mockReturnValue(makeAuth({ requestOtp }));
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));

    await act(async () => {
      const outcome = await result.current.sendOtp();
      expect(outcome.code).toBe('NETWORK_ERROR');
    });
  });

  it('surfaces a generic backend error message', async () => {
    const error = { response: { status: 500, data: { message: 'Could not send SMS' } } };
    const requestOtp = vi.fn().mockRejectedValue(error);
    useAuth.mockReturnValue(makeAuth({ requestOtp }));
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));

    await act(async () => {
      const outcome = await result.current.sendOtp();
      expect(outcome.code).toBe('SEND_GENERIC_ERROR');
      expect(outcome.message).toBe('Could not send SMS');
    });
  });

  it('enforces the client-side send rate limit before ever calling the API a 6th time', async () => {
    // The 45s resend cooldown alone would normally keep a real user well
    // under the 60s/5-attempt local limit; reset() is the only thing that
    // clears cooldown without waiting, so use it here to drive 6 sends in
    // immediate succession (attempt tracking lives in a ref, so it
    // survives reset() same as the real hook promises).
    const requestOtp = vi.fn().mockResolvedValue({ message: 'sent' });
    useAuth.mockReturnValue(makeAuth({ requestOtp }));
    const { result } = renderHook(() => useOtpFlow());

    for (let i = 0; i < 5; i++) {
      act(() => result.current.setPhoneDigits(VALID_PHONE));
      await act(async () => {
        await result.current.sendOtp();
      });
      act(() => result.current.reset());
    }
    expect(requestOtp).toHaveBeenCalledTimes(5);

    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      const outcome = await result.current.sendOtp();
      expect(outcome.ok).toBe(false);
      expect(outcome.code).toBe('SEND_RATE_LIMIT_LOCAL');
    });
    expect(requestOtp).toHaveBeenCalledTimes(5); // 6th call blocked client-side
  });
});

describe('resend cooldown ticking', () => {
  it('counts down to zero after sendOtp starts it', async () => {
    useAuth.mockReturnValue(makeAuth());
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });
    expect(result.current.cooldown).toBe(45);

    act(() => vi.advanceTimersByTime(45000));
    expect(result.current.cooldown).toBe(0);
  });

  it('blocks resend while the cooldown is still active', async () => {
    const requestOtp = vi.fn().mockResolvedValue({ message: 'sent' });
    useAuth.mockReturnValue(makeAuth({ requestOtp }));
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });
    requestOtp.mockClear();

    await act(async () => {
      const outcome = await result.current.resendOtp();
      expect(outcome).toEqual({ ok: false, code: 'NOOP' });
    });
    expect(requestOtp).not.toHaveBeenCalled();
  });
});

describe('verifyOtp', () => {
  async function setupAtOtpStep(authOverrides = {}) {
    const auth = makeAuth(authOverrides);
    useAuth.mockReturnValue(auth);
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });
    act(() => result.current.setOtp(VALID_OTP));
    return { result, auth };
  }

  it('is a no-op with an invalid (short) OTP', async () => {
    const { result } = await setupAtOtpStep();
    act(() => result.current.setOtp('123'));
    await act(async () => {
      const outcome = await result.current.verifyOtp();
      expect(outcome).toEqual({ ok: false, code: 'NOOP' });
    });
  });

  it('calls onVerified and reports success on a correct OTP', async () => {
    const onVerified = vi.fn();
    const confirmOtp = vi.fn().mockResolvedValue({ id: 'u1' });
    const auth = makeAuth({ confirmOtp });
    useAuth.mockReturnValue(auth);
    const { result } = renderHook(() => useOtpFlow({ onVerified }));
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });
    act(() => result.current.setOtp(VALID_OTP));

    await act(async () => {
      const outcome = await result.current.verifyOtp();
      expect(outcome).toEqual({ ok: true, code: 'VERIFY_OK' });
    });
    expect(confirmOtp).toHaveBeenCalledWith('+919876543210', VALID_OTP);
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('reports an invalid OTP without leaving the OTP step (attempts remain)', async () => {
    const confirmOtp = vi.fn().mockRejectedValue({ response: { status: 400, data: { message: 'Wrong code' } } });
    const { result } = await setupAtOtpStep({ confirmOtp });

    await act(async () => {
      const outcome = await result.current.verifyOtp();
      expect(outcome.code).toBe('VERIFY_INVALID');
      expect(outcome.message).toBe('Wrong code');
    });
    expect(result.current.step).toBe(STEP_OTP); // still has attempts left
    expect(result.current.otp).toBe(''); // cleared for re-entry
  });

  it('treats a 404 as an expired OTP', async () => {
    const confirmOtp = vi.fn().mockRejectedValue({ response: { status: 404 } });
    const { result } = await setupAtOtpStep({ confirmOtp });

    await act(async () => {
      const outcome = await result.current.verifyOtp();
      expect(outcome.code).toBe('VERIFY_EXPIRED');
    });
  });

  it('sends the user back to the phone step after 5 failed verify attempts', async () => {
    const confirmOtp = vi.fn().mockRejectedValue({ response: { status: 400, data: { message: 'Wrong code' } } });
    const { result } = await setupAtOtpStep({ confirmOtp });

    for (let i = 0; i < 4; i++) {
      act(() => result.current.setOtp(VALID_OTP));
      await act(async () => {
        await result.current.verifyOtp();
      });
      expect(result.current.step).toBe(STEP_OTP);
    }

    act(() => result.current.setOtp(VALID_OTP));
    await act(async () => {
      const outcome = await result.current.verifyOtp();
      expect(outcome.code).toBe('VERIFY_INVALID');
    });
    expect(result.current.step).toBe(STEP_PHONE); // attempts exhausted
    expect(confirmOtp).toHaveBeenCalledTimes(5);
  });

  it('surfaces a server 429 during verify and resets to the phone step', async () => {
    const confirmOtp = vi.fn().mockRejectedValue({ response: { status: 429 } });
    const { result } = await setupAtOtpStep({ confirmOtp });

    await act(async () => {
      const outcome = await result.current.verifyOtp();
      expect(outcome.code).toBe('VERIFY_RATE_LIMIT_SERVER');
    });
    expect(result.current.step).toBe(STEP_PHONE);
    expect(result.current.cooldown).toBe(60);
  });

  it('surfaces a network error distinctly during verify', async () => {
    const confirmOtp = vi.fn().mockRejectedValue(new Error('Network Error'));
    const { result } = await setupAtOtpStep({ confirmOtp });

    await act(async () => {
      const outcome = await result.current.verifyOtp();
      expect(outcome.code).toBe('NETWORK_ERROR');
    });
  });
});

describe('duplicate-submit guarding', () => {
  it('ignores a second verifyOtp call while the first is still in flight', async () => {
    let resolveConfirm;
    const confirmOtp = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveConfirm = resolve;
        })
    );
    useAuth.mockReturnValue(makeAuth({ confirmOtp }));
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });
    act(() => result.current.setOtp(VALID_OTP));

    let firstOutcomePromise;
    let secondOutcomePromise;
    act(() => {
      firstOutcomePromise = result.current.verifyOtp();
      secondOutcomePromise = result.current.verifyOtp(); // double-tap
    });

    const secondOutcome = await secondOutcomePromise;
    expect(secondOutcome).toEqual({ ok: false, code: 'NOOP' });
    expect(confirmOtp).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConfirm({ id: 'u1' });
      await firstOutcomePromise;
    });
  });
});

describe('reset / changeNumber', () => {
  it('reset returns to the phone step with cleared fields', async () => {
    useAuth.mockReturnValue(makeAuth());
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });
    expect(result.current.step).toBe(STEP_OTP);

    act(() => result.current.reset());
    expect(result.current.step).toBe(STEP_PHONE);
    expect(result.current.phoneDigits).toBe('');
    expect(result.current.otp).toBe('');
    expect(result.current.cooldown).toBe(0);
  });

  it('changeNumber goes back to the phone step but keeps the phone digits', async () => {
    useAuth.mockReturnValue(makeAuth());
    const { result } = renderHook(() => useOtpFlow());
    act(() => result.current.setPhoneDigits(VALID_PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });

    act(() => result.current.changeNumber());
    expect(result.current.step).toBe(STEP_PHONE);
    expect(result.current.phoneDigits).toBe(VALID_PHONE);
  });
});
