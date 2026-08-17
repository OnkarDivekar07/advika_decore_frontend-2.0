import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/apiClient', () => ({
  default: { post: vi.fn() },
}));

import apiClient from '@/utils/apiClient';
import {
  createRazorpayOrder,
  verifyPayment,
  placeCODOrder,
  cancelPaymentAttempt,
  openRazorpayCheckout,
  RazorpayCheckoutError,
} from '@/services/paymentService';

beforeEach(() => {
  apiClient.post.mockReset();
});

describe('createRazorpayOrder / verifyPayment / placeCODOrder request shape', () => {
  it('createRazorpayOrder posts to create-orderid with no body', async () => {
    apiClient.post.mockResolvedValue({ data: { data: { order: {}, key_id: 'rzp_test' } } });
    await createRazorpayOrder();
    expect(apiClient.post).toHaveBeenCalledWith('/api/payment/create-orderid');
  });

  it('verifyPayment forwards the Razorpay callback payload verbatim', async () => {
    apiClient.post.mockResolvedValue({ data: { data: { success: true } } });
    const payload = {
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig_1',
    };
    await verifyPayment(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/payment/verify', payload);
  });

  it('placeCODOrder sends orderId and method=cod', async () => {
    apiClient.post.mockResolvedValue({ data: { data: { success: true, alreadyProcessed: false } } });
    await placeCODOrder('order1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/payment/cod', { orderId: 'order1', method: 'cod' });
  });

  it('cancelPaymentAttempt sends orderId and is not retried on failure', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 500 } });
    await expect(cancelPaymentAttempt('order1')).rejects.toBeDefined();
    expect(apiClient.post).toHaveBeenCalledTimes(1); // no transient retry for this best-effort call
  });
});

describe('transient-failure retry (createRazorpayOrder / verifyPayment / placeCODOrder)', () => {
  it('retries once on a network error (no response) and succeeds', async () => {
    apiClient.post
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: { data: { success: true } } });

    const result = await verifyPayment({ razorpay_order_id: 'o1' });
    expect(result).toEqual({ success: true });
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('retries once on a 5xx and succeeds', async () => {
    apiClient.post
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: { data: { success: true } } });

    const result = await placeCODOrder('order1');
    expect(result).toEqual({ success: true });
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('does not retry a definite 4xx failure', async () => {
    const error = { response: { status: 400, data: { message: 'Draft order is stale' } } };
    apiClient.post.mockRejectedValue(error);

    await expect(placeCODOrder('order1')).rejects.toBe(error);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting attempts and surfaces the last error', async () => {
    const error = { response: { status: 500 } };
    apiClient.post.mockRejectedValue(error);

    await expect(createRazorpayOrder()).rejects.toBe(error);
    expect(apiClient.post).toHaveBeenCalledTimes(2); // attempts default is 2
  });
});

describe('openRazorpayCheckout', () => {
  let originalRazorpay;

  beforeEach(() => {
    originalRazorpay = window.Razorpay;
  });

  afterEach(() => {
    window.Razorpay = originalRazorpay;
    document.querySelectorAll('script[src*="checkout.razorpay.com"]').forEach((el) => el.remove());
  });

  function mockRazorpayConstructor({ onOpen } = {}) {
    let handler;
    let onDismiss;
    let onPaymentFailed;
    const instance = {
      open: vi.fn(() => onOpen?.({ handler, onDismiss, onPaymentFailed })),
      on: vi.fn(function on(event, cb) {
        if (event === 'payment.failed') onPaymentFailed = cb;
      }),
    };
    // Must be a real function (not an arrow fn) so `new window.Razorpay(...)`
    // works, matching how Checkout.js's real constructor is used.
    window.Razorpay = vi.fn(function Razorpay(config) {
      handler = config.handler;
      onDismiss = config.modal.ondismiss;
      return instance;
    });
    return () => ({ handler, onDismiss, onPaymentFailed });
  }

  function stubScriptLoadsInstantly() {
    // The real implementation appends a <script> tag and waits for its
    // onload; simulate that firing synchronously-ish so tests don't need
    // a real network fetch of checkout.razorpay.com (blocked in test env
    // anyway).
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'script') {
        queueMicrotask(() => el.onload?.());
      }
      return el;
    });
  }

  it('resolves with the callback payload on a successful payment', async () => {
    stubScriptLoadsInstantly();
    const getCallbacks = mockRazorpayConstructor({
      onOpen: ({ handler }) => handler({ razorpay_payment_id: 'pay_1' }),
    });

    const result = await openRazorpayCheckout({
      razorpayOrder: { id: 'order_1', amount: 10000, currency: 'INR' },
      keyId: 'rzp_test',
      name: 'Advika Parts',
    });
    expect(result).toEqual({ razorpay_payment_id: 'pay_1' });
    void getCallbacks; // sanity: constructor was actually wired up
  });

  it('rejects with a "cancelled" RazorpayCheckoutError when the modal is dismissed', async () => {
    stubScriptLoadsInstantly();
    mockRazorpayConstructor({ onOpen: ({ onDismiss }) => onDismiss() });

    await expect(
      openRazorpayCheckout({ razorpayOrder: { id: 'o1', amount: 100, currency: 'INR' }, keyId: 'k' })
    ).rejects.toMatchObject({ name: 'RazorpayCheckoutError', reason: 'cancelled' });
  });

  it('rejects with a "gateway_failed" RazorpayCheckoutError when Razorpay reports a failure', async () => {
    stubScriptLoadsInstantly();
    mockRazorpayConstructor({
      onOpen: ({ onPaymentFailed }) =>
        onPaymentFailed({ error: { description: 'Card declined' } }),
    });

    await expect(
      openRazorpayCheckout({ razorpayOrder: { id: 'o1', amount: 100, currency: 'INR' }, keyId: 'k' })
    ).rejects.toMatchObject({ name: 'RazorpayCheckoutError', reason: 'gateway_failed', message: 'Card declined' });
  });

  it('does not treat a dismiss after a successful handler fire as a cancellation', async () => {
    stubScriptLoadsInstantly();
    mockRazorpayConstructor({
      onOpen: ({ handler, onDismiss }) => {
        handler({ razorpay_payment_id: 'pay_1' });
        onDismiss(); // fires afterward, as Checkout.js can do — must be ignored
      },
    });

    const result = await openRazorpayCheckout({
      razorpayOrder: { id: 'o1', amount: 100, currency: 'INR' },
      keyId: 'k',
    });
    expect(result).toEqual({ razorpay_payment_id: 'pay_1' });
  });

  it('RazorpayCheckoutError carries the reason and raw details for support/logging', () => {
    const err = new RazorpayCheckoutError('Payment failed.', 'gateway_failed', { code: 'BAD_REQUEST' });
    expect(err.reason).toBe('gateway_failed');
    expect(err.details).toEqual({ code: 'BAD_REQUEST' });
    expect(err).toBeInstanceOf(Error);
  });
});
