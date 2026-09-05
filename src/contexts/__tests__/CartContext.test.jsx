import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('@/contexts/PricingContext', () => ({
  usePricing: () => ({
    calculateDeliveryCharge: (subtotal) => (subtotal >= 600 ? 0 : 49),
  }),
}));
vi.mock('@/services/cartService');
vi.mock('@/services/productsService', () => ({
  getProductsByIds: vi.fn().mockResolvedValue([]),
}));
vi.mock('react-toastify', () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import { useAuth } from '@/contexts/AuthContext';
import * as cartService from '@/services/cartService';
import { getProductsByIds } from '@/services/productsService';
import { toast } from 'react-toastify';
import { CartProvider, useCart, mergeCartItems } from '@/contexts/CartContext';

function wrapper({ children }) {
  return <CartProvider>{children}</CartProvider>;
}

const product = (overrides = {}) => ({
  id: 'p1',
  name: 'Brake Pad',
  price: 500,
  images: ['brake.jpg'],
  stock: 10,
  ...overrides,
});

// A rejecting async callback inside act() does not reliably flush the
// state updates that happened before the throw, so every test that
// expects a mutation to reject AND wants to assert the resulting state
// needs to catch the rejection from inside the act() boundary. This
// mirrors how a real caller (a component's onClick handler) would
// already be catching it, just made explicit for the test.
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
  window.localStorage.clear();
  vi.clearAllMocks();
  // Real cartService functions have named exports used both as
  // `cartService.getCart(...)` and destructured imports elsewhere in the
  // module under test — vi.mock('@/services/cartService') auto-mocks all
  // of them; give the ones CartContext actually calls a safe default.
  cartService.getCart.mockResolvedValue({ items: [], summary: null });
  cartService.saveCart.mockResolvedValue({ items: [], summary: null });
  cartService.updateCartItem.mockResolvedValue({ item: {}, summary: null });
  cartService.removeFromCart.mockResolvedValue({ summary: null });
  cartService.isCartConflictError.mockImplementation(
    (error) => error?.response?.status === 409 || error?.response?.status === 404
  );
  cartService.isInvalidCouponError.mockImplementation((error) => error?.response?.status === 404);
});

afterEach(() => {
  // Safety net: if a test enables fake timers and fails before reaching
  // its own cleanup, leaving them on would hang every subsequent test's
  // waitFor() calls (which poll on real timers) until Vitest's own
  // per-test timeout.
  vi.useRealTimers();
});

describe('mergeCartItems (pure)', () => {
  it('sums quantities for the same product id across backend and guest', () => {
    const merged = mergeCartItems(
      [{ productId: 'p1', quantity: 2 }],
      [{ id: 'p1', quantity: 3 }, { id: 'p2', quantity: 1 }]
    );
    expect(merged).toEqual(
      expect.arrayContaining([
        { productId: 'p1', quantity: 5 },
        { productId: 'p2', quantity: 1 },
      ])
    );
  });

  it('drops anything that nets to zero or negative', () => {
    const merged = mergeCartItems([{ productId: 'p1', quantity: 0 }], []);
    expect(merged).toEqual([]);
  });
});

describe('guest mode', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isAuthenticated: false, isRestoring: false });
  });

  it('starts empty and not syncing once auth settles', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.isBackend).toBe(false);
  });

  it('addItem persists to localStorage and updates itemCount/subtotal', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    await act(async () => {
      await result.current.addItem(product(), 2);
    });

    expect(result.current.itemCount).toBe(2);
    expect(result.current.subtotal).toBe(1000);
    expect(JSON.parse(window.localStorage.getItem('cart'))).toHaveLength(1);
  });

  it('clamps a new add to available stock and shows a toast', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    await act(async () => {
      await result.current.addItem(product({ stock: 3 }), 10);
    });

    expect(result.current.items[0].quantity).toBe(3);
    expect(toast.info).toHaveBeenCalled();
  });

  it('refuses to add an out-of-stock product', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    await act(async () => {
      await result.current.addItem(product({ stock: 0 }), 1);
    });

    expect(result.current.items).toEqual([]);
    expect(toast.error).toHaveBeenCalled();
  });

  it('updateQuantity below 1 removes the item', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    await act(async () => {
      await result.current.addItem(product(), 2);
    });

    act(() => result.current.updateQuantity('p1', 0));
    await waitFor(() => expect(result.current.items).toEqual([]));
  });

  it('removeItem removes from state and localStorage', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    await act(async () => {
      await result.current.addItem(product(), 1);
    });

    await act(async () => {
      await result.current.removeItem('p1');
    });
    expect(result.current.items).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem('cart'))).toEqual([]);
  });

  it('adds delivery charge below the free-delivery threshold, waives it above', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    await act(async () => {
      await result.current.addItem(product({ id: 'cheap', price: 100 }), 1);
    });
    expect(result.current.deliveryCharge).toBe(49); // below 600

    await act(async () => {
      await result.current.addItem(product({ id: 'expensive', price: 600 }), 1);
    });
    expect(result.current.deliveryCharge).toBe(0); // now >= 600
  });
});

describe('backend mode', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isAuthenticated: true, isRestoring: false });
  });

  it('loads the backend cart and adopts its server-computed summary', async () => {
    cartService.getCart.mockResolvedValue({
      items: [{ productId: 'p1', quantity: 2, product: { name: 'Brake Pad', price: 500, images: [], stock: 10 } }],
      summary: { subtotal: 1000, deliveryCharge: 0, total: 1000 },
    });

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    expect(result.current.isBackend).toBe(true);
    expect(result.current.items).toEqual([
      { id: 'p1', name: 'Brake Pad', price: 500, quantity: 2, image: '', stock: 10 },
    ]);
    expect(result.current.total).toBe(1000);
  });

  it('shows a load error and offers a working retry when the initial sync fails', async () => {
    cartService.getCart.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(result.current.loadError).toBe(true);

    cartService.getCart.mockResolvedValue({ items: [], summary: { subtotal: 0, deliveryCharge: 0, total: 0 } });
    await act(async () => {
      await result.current.retryLoadCart();
    });
    expect(result.current.loadError).toBe(false);
    expect(result.current.isBackend).toBe(true);
  });

  it('addItem optimistically updates then adopts the server summary', async () => {
    // Initial load is empty; every getCart() call after the add (the
    // background reconcile addItem fires) resolves to the same post-add
    // snapshot, so the assertion is stable regardless of which call wins
    // the race with the direct summary returned by updateCartItem.
    cartService.getCart
      .mockResolvedValueOnce({ items: [], summary: { subtotal: 0, deliveryCharge: 49, total: 49 } })
      .mockResolvedValue({
        items: [{ productId: 'p1', quantity: 1, product: { name: 'Brake Pad', price: 500, images: [], stock: 10 } }],
        summary: { subtotal: 500, deliveryCharge: 49, total: 549 },
      });
    cartService.updateCartItem.mockResolvedValue({
      item: {},
      summary: { subtotal: 500, deliveryCharge: 49, total: 549 },
    });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    await act(async () => {
      await result.current.addItem(product(), 1);
    });

    expect(cartService.updateCartItem).toHaveBeenCalledWith('p1', 1);
    await waitFor(() => expect(result.current.total).toBe(549));
  });

  it('rolls back the optimistic add and reports the error on a plain failure', async () => {
    cartService.getCart.mockResolvedValue({ items: [], summary: { subtotal: 0, deliveryCharge: 0, total: 0 } });
    cartService.updateCartItem.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    const error = await actCatching(() => result.current.addItem(product(), 1));

    expect(error).toBeDefined();
    expect(result.current.items).toEqual([]); // rolled back
  });

  it('rolls back the optimistic remove and rethrows on failure, same as addItem', async () => {
    cartService.getCart.mockResolvedValue({
      items: [{ productId: 'p1', quantity: 1, product: { name: 'Brake Pad', price: 500, images: [], stock: 10 } }],
      summary: { subtotal: 500, deliveryCharge: 49, total: 549 },
    });
    cartService.removeFromCart.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    const error = await actCatching(() => result.current.removeItem('p1'));

    expect(error).toBeDefined();
    // Rolled back to the item still being present, and the caller can
    // actually observe the failure (previously removeItem swallowed it).
    expect(result.current.items).toEqual([
      { id: 'p1', name: 'Brake Pad', price: 500, quantity: 1, image: '', stock: 10 },
    ]);
  });

  it('reloads the authoritative cart (not a blind rollback) on a stale/stock conflict', async () => {
    cartService.getCart
      .mockResolvedValueOnce({ items: [], summary: { subtotal: 0, deliveryCharge: 0, total: 0 } }) // initial load
      .mockResolvedValueOnce({
        items: [{ productId: 'p1', quantity: 1, product: { name: 'Brake Pad', price: 500, images: [], stock: 1 } }],
        summary: { subtotal: 500, deliveryCharge: 49, total: 549 },
      }); // post-conflict reload
    cartService.updateCartItem.mockRejectedValue({ response: { status: 409 } });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    const error = await actCatching(() => result.current.addItem(product({ stock: 10 }), 5));

    expect(error).toBeDefined();
    // Reflects the server's reloaded truth, not the client's stale guess.
    expect(result.current.items).toEqual([
      { id: 'p1', name: 'Brake Pad', price: 500, quantity: 1, image: '', stock: 1 },
    ]);
  });

  it('debounces rapid quantity taps on the same item into a single backend call', async () => {
    cartService.getCart.mockResolvedValue({
      items: [{ productId: 'p1', quantity: 1, product: { name: 'Brake Pad', price: 500, images: [], stock: 10 } }],
      summary: { subtotal: 500, deliveryCharge: 49, total: 549 },
    });
    cartService.updateCartItem.mockResolvedValue({
      item: {},
      summary: { subtotal: 1500, deliveryCharge: 49, total: 1549 },
    });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    // Fake timers only from here on — the initial load above already
    // settled on real timers/microtasks.
    vi.useFakeTimers();

    act(() => result.current.updateQuantity('p1', 2));
    act(() => result.current.updateQuantity('p1', 3));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.updateQuantity('p1', 4)); // resets the debounce window again
    expect(result.current.items[0].quantity).toBe(4); // UI already reflects the latest tap
    expect(cartService.updateCartItem).not.toHaveBeenCalled(); // nothing sent yet

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(cartService.updateCartItem).toHaveBeenCalledTimes(1);
    expect(cartService.updateCartItem).toHaveBeenCalledWith('p1', 4); // only the final value
  });
});

describe('guest -> backend cart merge on login', () => {
  it('merges the guest cart into the backend cart and clears localStorage', async () => {
    window.localStorage.setItem(
      'cart',
      JSON.stringify([{ id: 'p1', name: 'Brake Pad', price: 500, quantity: 2, image: '', stock: 10 }])
    );
    cartService.getCart
      .mockResolvedValueOnce({ items: [{ productId: 'p1', quantity: 1 }], summary: null }) // pre-merge read
      .mockResolvedValueOnce({
        items: [{ productId: 'p1', quantity: 3, product: { name: 'Brake Pad', price: 500, images: [], stock: 10 } }],
        summary: { subtotal: 1500, deliveryCharge: 0, total: 1500 },
      }); // post-merge load
    cartService.saveCart.mockResolvedValue({});
    useAuth.mockReturnValue({ isAuthenticated: true, isRestoring: false });

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    expect(cartService.saveCart).toHaveBeenCalledWith([{ productId: 'p1', quantity: 3 }]);
    expect(result.current.isBackend).toBe(true);
    expect(window.localStorage.getItem('cart')).toBeNull();
  });

  it('does not sync while auth is still restoring', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isRestoring: true });
    renderHook(() => useCart(), { wrapper });
    expect(cartService.getCart).not.toHaveBeenCalled();
  });
});

describe('backend -> guest cart fallback on logout', () => {
  it('resets to the guest localStorage cart and drops the stale backend summary/error state', async () => {
    cartService.getCart.mockResolvedValueOnce({
      items: [{ productId: 'p1', quantity: 2, product: { name: 'Brake Pad', price: 500, images: [], stock: 10 } }],
      summary: { subtotal: 1000, deliveryCharge: 0, total: 1000 },
    });
    useAuth.mockReturnValue({ isAuthenticated: true, isRestoring: false });

    const { result, rerender } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(result.current.isBackend).toBe(true);
    expect(result.current.total).toBe(1000);

    // A different guest cart already sitting in localStorage — proves the
    // logout path actually re-reads it rather than just clearing to empty.
    window.localStorage.setItem(
      'cart',
      JSON.stringify([{ id: 'p2', name: 'Air Filter', price: 300, quantity: 1, image: '', stock: 5 }])
    );
    // Guest-mode revalidation (see revalidateGuestCart) checks the newly
    // fallen-back-to items against live product data on the very first
    // guest-mode landing — give it a matching live product so it doesn't
    // treat 'p2' as delisted and drop it.
    getProductsByIds.mockResolvedValue([{ id: 'p2', name: 'Air Filter', price: 300, stock: 5 }]);

    useAuth.mockReturnValue({ isAuthenticated: false, isRestoring: false });
    await act(async () => {
      rerender();
    });

    expect(result.current.isBackend).toBe(false);
    expect(result.current.items).toEqual([
      { id: 'p2', name: 'Air Filter', price: 300, quantity: 1, image: '', stock: 5 },
    ]);
    // The backend total (1000) must not leak into the post-logout guest
    // total — it should now be computed from the guest cart alone (300 +
    // delivery, per the mocked calculateDeliveryCharge: 300 < 600 -> 49).
    expect(result.current.total).toBe(349);
    expect(result.current.loadError).toBe(false);
  });
});

describe('coupon preview', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isAuthenticated: false, isRestoring: false });
  });

  it('applies a valid coupon and reduces the payable total', async () => {
    cartService.previewCoupon.mockResolvedValue({ couponCode: 'SAVE10', discount: 100 });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    await act(async () => {
      await result.current.addItem(product(), 1);
    });

    await act(async () => {
      await result.current.applyCoupon('SAVE10');
    });
    expect(result.current.coupon.status).toBe('applied');
    expect(result.current.total).toBe(result.current.subtotal + result.current.deliveryCharge - 100);
  });

  it('surfaces a 404 as an invalid-code message, not a generic failure', async () => {
    cartService.previewCoupon.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    await act(async () => {
      await result.current.applyCoupon('BADCODE');
    });
    expect(result.current.coupon.status).toBe('error');
    expect(result.current.coupon.error).toMatch(/invalid|expired/i);
  });

  it('clears the coupon automatically once the cart changes again', async () => {
    cartService.previewCoupon.mockResolvedValue({ couponCode: 'SAVE10', discount: 100 });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    await act(async () => {
      await result.current.addItem(product(), 1);
    });
    await act(async () => {
      await result.current.applyCoupon('SAVE10');
    });
    expect(result.current.coupon.status).toBe('applied');

    await act(async () => {
      await result.current.addItem(product({ id: 'p2' }), 1);
    });
    expect(result.current.coupon.status).toBe('idle');
  });
});
