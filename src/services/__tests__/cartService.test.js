import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '@/utils/apiClient';
import {
  getCart,
  saveCart,
  updateCartItem,
  removeFromCart,
  previewCoupon,
  isInvalidCouponError,
  isCartConflictError,
} from '@/services/cartService';

beforeEach(() => {
  Object.values(apiClient).forEach((fn) => fn.mockReset());
});

describe('getCart', () => {
  it('returns items and summary from the response envelope', async () => {
    apiClient.get.mockResolvedValue({
      data: { data: [{ productId: 'p1', quantity: 2 }], meta: { summary: { total: 500 } } },
    });
    const result = await getCart();
    expect(apiClient.get).toHaveBeenCalledWith('/api/cart');
    expect(result).toEqual({ items: [{ productId: 'p1', quantity: 2 }], summary: { total: 500 } });
  });

  it('defaults to an empty items array and null summary when the envelope is bare', async () => {
    apiClient.get.mockResolvedValue({ data: {} });
    const result = await getCart();
    expect(result).toEqual({ items: [], summary: null });
  });
});

describe('saveCart / updateCartItem / removeFromCart', () => {
  it('saveCart posts the full cart and returns the server-computed summary', async () => {
    apiClient.post.mockResolvedValue({ data: { data: [{ productId: 'p1' }], meta: { summary: { total: 100 } } } });
    const result = await saveCart([{ productId: 'p1', quantity: 1 }]);
    expect(apiClient.post).toHaveBeenCalledWith('/api/cart', { cartItems: [{ productId: 'p1', quantity: 1 }] });
    expect(result.summary).toEqual({ total: 100 });
  });

  it('updateCartItem PUTs productId/quantity and returns the updated line item', async () => {
    apiClient.put.mockResolvedValue({ data: { data: { productId: 'p1', quantity: 3 }, meta: { summary: {} } } });
    const result = await updateCartItem('p1', 3);
    expect(apiClient.put).toHaveBeenCalledWith('/api/cart', { productId: 'p1', quantity: 3 });
    expect(result.item).toEqual({ productId: 'p1', quantity: 3 });
  });

  it('removeFromCart sends productId in the DELETE body and returns the refreshed summary', async () => {
    apiClient.delete.mockResolvedValue({ data: { meta: { summary: { total: 0 } } } });
    const result = await removeFromCart('p1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/cart', { data: { productId: 'p1' } });
    expect(result).toEqual({ summary: { total: 0 } });
  });
});

describe('previewCoupon', () => {
  it('returns the coupon preview payload', async () => {
    apiClient.post.mockResolvedValue({
      data: { data: { couponCode: 'SAVE10', subtotal: 1000, discount: 100, deliveryCharge: 50, total: 950 } },
    });
    const result = await previewCoupon('SAVE10');
    expect(apiClient.post).toHaveBeenCalledWith('/api/cart/coupon', { couponCode: 'SAVE10' });
    expect(result.discount).toBe(100);
  });
});

describe('isInvalidCouponError', () => {
  it('treats a 404 as an invalid/unknown coupon code', () => {
    // No real coupon system exists on the backend yet — every code comes
    // back 404, and the UI must show "invalid code", not a generic error.
    expect(isInvalidCouponError({ response: { status: 404 } })).toBe(true);
  });

  it('does not treat a 500 or network error as an invalid coupon', () => {
    expect(isInvalidCouponError({ response: { status: 500 } })).toBe(false);
    expect(isInvalidCouponError(new Error('Network Error'))).toBe(false);
    expect(isInvalidCouponError(undefined)).toBe(false);
  });
});

describe('isCartConflictError', () => {
  it('treats 409 and 404 as a stale-cart conflict', () => {
    expect(isCartConflictError({ response: { status: 409 } })).toBe(true);
    expect(isCartConflictError({ response: { status: 404 } })).toBe(true);
  });

  it('treats a 400 with a stock-flavored message as a conflict', () => {
    expect(
      isCartConflictError({ response: { status: 400, data: { message: 'Insufficient stock available' } } })
    ).toBe(true);
    expect(
      isCartConflictError({ response: { status: 400, data: { error: 'Product is out of stock' } } })
    ).toBe(true);
  });

  it('does not treat an unrelated 400 validation error as a conflict', () => {
    expect(
      isCartConflictError({ response: { status: 400, data: { message: 'Quantity must be a positive integer' } } })
    ).toBe(false);
  });

  it('does not treat a 500/network error as a conflict (real failure, not staleness)', () => {
    expect(isCartConflictError({ response: { status: 500 } })).toBe(false);
    expect(isCartConflictError(new Error('Network Error'))).toBe(false);
  });
});
