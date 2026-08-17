import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/features/products/hooks/useDebouncedValue';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 400));
    expect(result.current).toBe('initial');
  });

  it('does not update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('a');
  });

  it('updates once the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('ab');
  });

  it('resets the timer on every keystroke, only settling on the last value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'abc' });
    act(() => vi.advanceTimersByTime(200));
    // Original 400ms window from the first keystroke would have elapsed
    // by now, but it was reset by the second keystroke.
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('abc');
  });

  it('uses the default 400ms delay when none is given', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });
});
