import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));
vi.mock('@/services/addressService');
vi.mock('@/services/orderService');
vi.mock('@/services/paymentService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual, // keep the real RazorpayCheckoutError class intact
    createRazorpayOrder: vi.fn(),
    verifyPayment: vi.fn(),
    placeCODOrder: vi.fn(),
    cancelPaymentAttempt: vi.fn(),
    openRazorpayCheckout: vi.fn(),
  };
});
vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn(),
}));

import * as addressService from '@/services/addressService';
import * as orderService from '@/services/orderService';
import * as paymentService from '@/services/paymentService';
import { RazorpayCheckoutError } from '@/services/paymentService';
import { CheckoutProvider, useCheckout } from '@/contexts/CheckoutContext';

function wrapper({ children }) {
  return <CheckoutProvider>{children}</CheckoutProvider>;
}

const address = (overrides = {}) => ({ id: 'addr1', name: 'Home', isDefault: true, ...overrides });
const draftOrder = (overrides = {}) => ({
  id: 'order1',
  status: 'draft',
  total: 1000,
  orderItems: [],
  ...overrides,
});

// Same reasoning as CartContext's tests: a rejecting async act() callback
// doesn't reliably flush state updates made before the throw.
async function actCatching(fn) {
  let caught;
  await act(async () => {
    try {
      await fn();
    } catch (error) {
      caught = error;
    }
  });
  return caught;
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  addressService.getAddresses.mockResolvedValue([]);
  orderService.createOrUpdateDraftOrder.mockResolvedValue(draftOrder());
  orderService.getOrderById.mockResolvedValue(draftOrder());
});

describe('address selection -> draft order', () => {
  it('starts with nothing selected and payment unreachable', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    expect(result.current.selectedAddressId).toBeNull();
    expect(result.current.canProceedToReview).toBe(false);
    expect(result.current.canProceedToPayment).toBe(false);
  });

  it('selectAddress refreshes the draft order and unlocks review', async () => {
    orderService.createOrUpdateDraftOrder.mockResolvedValue(draftOrder({ total: 1500 }));
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    await act(async () => {
      await result.current.selectAddress('addr1');
    });

    expect(orderService.createOrUpdateDraftOrder).toHaveBeenCalledWith('addr1', null);
    expect(result.current.draftOrder.total).toBe(1500);
    expect(result.current.canProceedToReview).toBe(true);
    expect(result.current.canProceedToPayment).toBe(false); // not reviewed yet
  });

  it('does not persist a selection the backend rejected', async () => {
    orderService.createOrUpdateDraftOrder.mockRejectedValue({ response: { status: 400 } });
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    await act(async () => {
      await result.current.selectAddress('addr1');
    });

    expect(result.current.draftStatus).toBe('error');
    expect(result.current.canProceedToReview).toBe(false);
  });

  it('addAddress appends the address and selects it', async () => {
    addressService.createAddress.mockResolvedValue(address({ id: 'addr2', isDefault: false }));
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    await act(async () => {
      await result.current.addAddress({ name: 'Office' });
    });

    expect(result.current.addresses.map((a) => a.id)).toEqual(['addr2']);
    expect(result.current.selectedAddressId).toBe('addr2');
  });

  it('removeAddress clears the selection and draft order when the selected address is removed', async () => {
    addressService.getAddresses.mockResolvedValue([address()]);
    addressService.deleteAddress.mockResolvedValue({});
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await act(async () => {
      await result.current.loadAddresses();
    });
    await act(async () => {
      await result.current.selectAddress('addr1');
    });
    expect(result.current.selectedAddressId).toBe('addr1');

    await act(async () => {
      await result.current.removeAddress('addr1');
    });

    expect(result.current.selectedAddressId).toBeNull();
    expect(result.current.draftOrder).toBeNull();
    expect(result.current.draftStatus).toBe('idle');
  });
});

describe('review gating', () => {
  it('confirmReview requires a selected address and a ready draft order', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    act(() => result.current.confirmReview());
    expect(result.current.reviewConfirmed).toBe(false); // nothing selected yet
  });

  it('confirmReview unlocks canProceedToPayment', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await act(async () => {
      await result.current.selectAddress('addr1');
    });

    act(() => result.current.confirmReview());
    expect(result.current.canProceedToPayment).toBe(true);
  });

  it('re-selecting an address resets a previously confirmed review', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await act(async () => {
      await result.current.selectAddress('addr1');
    });
    act(() => result.current.confirmReview());
    expect(result.current.reviewConfirmed).toBe(true);

    await act(async () => {
      await result.current.selectAddress('addr2');
    });
    expect(result.current.reviewConfirmed).toBe(false);
  });
});

describe('placeCODOrder', () => {
  async function selectAndReview(result) {
    await act(async () => {
      await result.current.selectAddress('addr1');
    });
    act(() => result.current.confirmReview());
  }

  it('places the order and clears saved checkout state on success', async () => {
    paymentService.placeCODOrder.mockResolvedValue({ order: { id: 'order1', status: 'confirmed' } });
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    let placed;
    await act(async () => {
      placed = await result.current.placeCODOrder();
    });

    expect(paymentService.placeCODOrder).toHaveBeenCalledWith('order1');
    expect(placed).toEqual({ id: 'order1', status: 'confirmed' });
    expect(window.sessionStorage.getItem('checkoutState')).toBeNull();
  });

  it('tracks isPlacingOrder while the request is in flight', async () => {
    let resolvePlace;
    paymentService.placeCODOrder.mockImplementation(
      () => new Promise((resolve) => { resolvePlace = resolve; })
    );
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    let placePromise;
    act(() => {
      placePromise = result.current.placeCODOrder();
    });
    expect(result.current.isPlacingOrder).toBe(true);

    await act(async () => {
      resolvePlace({ order: { id: 'order1' } });
      await placePromise;
    });
    expect(result.current.isPlacingOrder).toBe(false);
  });

  it('surfaces stock/price conflicts reported by the backend instead of a generic failure', async () => {
    paymentService.placeCODOrder.mockRejectedValue({
      response: {
        status: 409,
        data: { errors: { conflicts: [{ productId: 'p1', reason: 'price_changed' }] } },
      },
    });
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    const error = await actCatching(() => result.current.placeCODOrder());

    expect(error).toBeDefined();
    expect(result.current.conflicts).toEqual([{ productId: 'p1', reason: 'price_changed' }]);
  });

  it('rejects without a draft order', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    await expect(result.current.placeCODOrder()).rejects.toThrow('No draft order to place.');
  });
});

describe('payOnline', () => {
  async function selectAndReview(result) {
    await act(async () => {
      await result.current.selectAddress('addr1');
    });
    act(() => result.current.confirmReview());
  }

  it('happy path: creates the Razorpay order, opens checkout, verifies, and resolves paid', async () => {
    paymentService.createRazorpayOrder.mockResolvedValue({
      order: { id: 'rzp_order_1', amount: 100000, currency: 'INR' },
      key_id: 'rzp_test',
    });
    paymentService.openRazorpayCheckout.mockResolvedValue({
      razorpay_order_id: 'rzp_order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig',
    });
    paymentService.verifyPayment.mockResolvedValue({ success: true, orderId: 'order1' });

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    let outcome;
    await act(async () => {
      outcome = await result.current.payOnline({ customerName: 'Test', customerPhone: '9876543210' });
    });

    expect(outcome).toEqual({ orderId: 'order1', paymentStatus: 'paid' });
    expect(window.sessionStorage.getItem('checkoutState')).toBeNull();
  });

  it('treats an already-reconciled Razorpay order as paid without opening the modal', async () => {
    paymentService.createRazorpayOrder.mockResolvedValue({ alreadyPaid: true, orderId: 'order1' });
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    let outcome;
    await act(async () => {
      outcome = await result.current.payOnline({});
    });

    expect(outcome).toEqual({ orderId: 'order1', paymentStatus: 'paid' });
    expect(paymentService.openRazorpayCheckout).not.toHaveBeenCalled();
  });

  it('on a stale-draft conflict (409), surfaces conflicts and does not attempt reconciliation', async () => {
    paymentService.createRazorpayOrder.mockRejectedValue({
      response: { status: 409, data: { errors: { conflicts: [{ productId: 'p1' }] } } },
    });
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    const error = await actCatching(() => result.current.payOnline({}));

    expect(error).toBeDefined();
    expect(result.current.conflicts).toEqual([{ productId: 'p1' }]);
    expect(orderService.getOrderById).not.toHaveBeenCalled();
  });

  it('on customer cancellation, notifies the backend and rethrows without reconciling', async () => {
    paymentService.createRazorpayOrder.mockResolvedValue({
      order: { id: 'rzp_order_1', amount: 100000, currency: 'INR' },
      key_id: 'rzp_test',
    });
    paymentService.openRazorpayCheckout.mockRejectedValue(
      new RazorpayCheckoutError('Payment cancelled.', 'cancelled')
    );
    paymentService.cancelPaymentAttempt.mockResolvedValue({ cancelled: true });

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    const error = await actCatching(() => result.current.payOnline({}));

    expect(error).toBeDefined();
    expect(error.reason).toBe('cancelled');
    expect(paymentService.cancelPaymentAttempt).toHaveBeenCalledWith('order1');
    expect(orderService.getOrderById).not.toHaveBeenCalled(); // nothing to reconcile — no money moved
  });

  it('on gateway failure, rethrows without reconciling and without cancelling', async () => {
    paymentService.createRazorpayOrder.mockResolvedValue({
      order: { id: 'rzp_order_1', amount: 100000, currency: 'INR' },
      key_id: 'rzp_test',
    });
    paymentService.openRazorpayCheckout.mockRejectedValue(
      new RazorpayCheckoutError('Card declined', 'gateway_failed')
    );

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    const error = await actCatching(() => result.current.payOnline({}));

    expect(error.reason).toBe('gateway_failed');
    expect(paymentService.cancelPaymentAttempt).not.toHaveBeenCalled();
    expect(orderService.getOrderById).not.toHaveBeenCalled();
  });

  it('on an ambiguous failure (e.g. verify timed out), reconciles and resolves paid if the order actually went through', async () => {
    paymentService.createRazorpayOrder.mockResolvedValue({
      order: { id: 'rzp_order_1', amount: 100000, currency: 'INR' },
      key_id: 'rzp_test',
    });
    paymentService.openRazorpayCheckout.mockResolvedValue({
      razorpay_order_id: 'rzp_order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig',
    });
    paymentService.verifyPayment.mockRejectedValue(new Error('Network Error'));
    orderService.getOrderById.mockResolvedValue(draftOrder({ paymentStatus: 'paid' }));

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    let outcome;
    await act(async () => {
      outcome = await result.current.payOnline({});
    });

    expect(outcome).toEqual({ orderId: 'order1', paymentStatus: 'paid' });
  });

  it('on an ambiguous failure where the order genuinely never paid, rethrows the original error with the order id attached', async () => {
    paymentService.createRazorpayOrder.mockResolvedValue({
      order: { id: 'rzp_order_1', amount: 100000, currency: 'INR' },
      key_id: 'rzp_test',
    });
    paymentService.openRazorpayCheckout.mockResolvedValue({
      razorpay_order_id: 'rzp_order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig',
    });
    paymentService.verifyPayment.mockRejectedValue(new Error('Network Error'));
    orderService.getOrderById.mockResolvedValue(draftOrder({ paymentStatus: 'pending' }));

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await selectAndReview(result);

    const error = await actCatching(() => result.current.payOnline({}));

    expect(error).toBeDefined();
    expect(error.orderId).toBe('order1');
  });

  it('rejects without a draft order', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    await expect(result.current.payOnline({})).rejects.toThrow('No draft order to pay for.');
  });
});

describe('duplicate-submit protection via isPlacingOrder', () => {
  it('a component should gate on isPlacingOrder to avoid a double COD submit', async () => {
    // The context itself doesn't block a second placeCODOrder call while
    // one is in flight (that's the caller's job, via isPlacingOrder) — this
    // test documents that isPlacingOrder actually reflects the in-flight
    // window a "Place Order" button would disable itself on.
    let resolvePlace;
    paymentService.placeCODOrder.mockImplementation(
      () => new Promise((resolve) => { resolvePlace = resolve; })
    );
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await act(async () => {
      await result.current.selectAddress('addr1');
    });
    act(() => result.current.confirmReview());

    expect(result.current.isPlacingOrder).toBe(false);
    act(() => {
      result.current.placeCODOrder();
    });
    expect(result.current.isPlacingOrder).toBe(true); // a button bound to this would now be disabled

    await act(async () => {
      resolvePlace({ order: { id: 'order1' } });
      await Promise.resolve();
    });
  });
});

describe('restore-on-mount for a payment interrupted by a refresh', () => {
  it('jumps straight to the success page when the pending order already confirmed', async () => {
    window.sessionStorage.setItem(
      'checkoutState',
      JSON.stringify({ selectedAddressId: 'addr1', pendingPaymentOrderId: 'order1' })
    );
    orderService.getOrderById.mockResolvedValue({
      id: 'order1',
      status: 'confirmed',
      paymentStatus: 'paid',
    });

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(navigateMock).toHaveBeenCalledWith(
      '/order/success/order1',
      expect.objectContaining({ replace: true })
    );
    expect(window.sessionStorage.getItem('checkoutState')).toBeNull();
  });

  it('falls through to the normal draft-order restore when the pending order is still a draft', async () => {
    window.sessionStorage.setItem(
      'checkoutState',
      JSON.stringify({ selectedAddressId: 'addr1', pendingPaymentOrderId: 'order1', reviewConfirmed: true })
    );
    orderService.getOrderById.mockResolvedValue({ id: 'order1', status: 'draft' });
    addressService.getAddresses.mockResolvedValue([address()]);
    orderService.createOrUpdateDraftOrder.mockResolvedValue(draftOrder());

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.selectedAddressId).toBe('addr1');
    expect(result.current.reviewConfirmed).toBe(true);
  });

  it('drops the saved selection if the address no longer exists', async () => {
    window.sessionStorage.setItem('checkoutState', JSON.stringify({ selectedAddressId: 'gone' }));
    addressService.getAddresses.mockResolvedValue([address({ id: 'addr1' })]); // 'gone' isn't in the list

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(result.current.selectedAddressId).toBeNull();
    expect(result.current.step).toBe('address');
    expect(window.sessionStorage.getItem('checkoutState')).toBeNull();
  });

  it('does nothing (and never restores) when there is nothing saved', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    // isRestoring should already be false on the very first render for a
    // fresh visit — nothing to await here.
    expect(result.current.isRestoring).toBe(false);
    await waitFor(() => expect(addressService.getAddresses).not.toHaveBeenCalled());
  });
});
