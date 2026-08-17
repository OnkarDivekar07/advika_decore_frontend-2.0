import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeGuestCartItems,
  getCartFromLocalStorage,
  updateCartToLocalStorage,
  clearCartFromLocalStorage,
  markGuestCartMerged,
  isGuestCartMergePending,
  clearGuestCartMergeMarker,
  getBuyNowItem,
  setBuyNowItem,
  clearBuyNowItem,
} from '@/features/cart/cartUtils';
import { MAX_CART_QUANTITY } from '@/config/cartLimits';

beforeEach(() => {
  window.localStorage.clear();
});

describe('normalizeGuestCartItems', () => {
  it('returns an empty array for non-array input', () => {
    expect(normalizeGuestCartItems(null)).toEqual([]);
    expect(normalizeGuestCartItems(undefined)).toEqual([]);
    expect(normalizeGuestCartItems({})).toEqual([]);
  });

  it('drops entries with no usable id', () => {
    const result = normalizeGuestCartItems([{ quantity: 1, price: 10 }, { id: '', quantity: 1 }]);
    expect(result).toEqual([]);
  });

  it('drops entries with a corrupted/zero/negative quantity', () => {
    const result = normalizeGuestCartItems([
      { id: 'p1', quantity: 0, price: 10 },
      { id: 'p2', quantity: -3, price: 10 },
      { id: 'p3', quantity: 'not-a-number', price: 10 },
    ]);
    expect(result).toEqual([]);
  });

  it('floors a fractional quantity', () => {
    const result = normalizeGuestCartItems([{ id: 'p1', quantity: 2.9, price: 10 }]);
    expect(result[0].quantity).toBe(2);
  });

  it('merges duplicate rows for the same product id by summing quantity', () => {
    const result = normalizeGuestCartItems([
      { id: 'p1', name: 'Brake Pad', quantity: 2, price: 500 },
      { id: 'p1', name: 'Brake Pad (dup)', quantity: 3, price: 500 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);
    // Keeps the first row's metadata.
    expect(result[0].name).toBe('Brake Pad');
  });

  it('clamps quantity to the item stock ceiling', () => {
    const result = normalizeGuestCartItems([{ id: 'p1', quantity: 10, price: 100, stock: 3 }]);
    expect(result[0].quantity).toBe(3);
  });

  it('drops an item entirely if stock clamps quantity to 0', () => {
    const result = normalizeGuestCartItems([{ id: 'p1', quantity: 5, price: 100, stock: 0 }]);
    expect(result).toEqual([]);
  });

  it('clamps quantity to MAX_CART_QUANTITY even without a stock ceiling', () => {
    const result = normalizeGuestCartItems([
      { id: 'p1', quantity: MAX_CART_QUANTITY + 500, price: 100 },
    ]);
    expect(result[0].quantity).toBe(MAX_CART_QUANTITY);
  });

  it('defaults price to 0 when it is not a finite number', () => {
    const result = normalizeGuestCartItems([{ id: 'p1', quantity: 1, price: 'free' }]);
    expect(result[0].price).toBe(0);
  });
});

describe('getCartFromLocalStorage / updateCartToLocalStorage', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(getCartFromLocalStorage()).toEqual([]);
  });

  it('returns an empty array (not a throw) for corrupted JSON', () => {
    window.localStorage.setItem('cart', '{not-json');
    expect(getCartFromLocalStorage()).toEqual([]);
  });

  it('round-trips a valid cart', () => {
    const cart = [{ id: 'p1', name: 'Chain', price: 200, quantity: 2, image: '', stock: 10 }];
    updateCartToLocalStorage(cart);
    expect(getCartFromLocalStorage()).toEqual(cart);
  });

  it('self-heals a corrupted-but-parseable cart by writing back the normalized version', () => {
    window.localStorage.setItem(
      'cart',
      JSON.stringify([
        { id: 'p1', quantity: 2, price: 100 },
        { id: 'p1', quantity: 3, price: 100 }, // duplicate row
      ])
    );
    const result = getCartFromLocalStorage();
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);

    // The self-heal should have persisted the cleaned-up version.
    const stored = JSON.parse(window.localStorage.getItem('cart'));
    expect(stored).toHaveLength(1);
    expect(stored[0].quantity).toBe(5);
  });

  it('updateCartToLocalStorage returns false and reports the error if storage write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const ok = updateCartToLocalStorage([{ id: 'p1', quantity: 1 }]);
    expect(ok).toBe(false);
    spy.mockRestore();
  });
});

describe('clearCartFromLocalStorage', () => {
  it('removes the stored cart', () => {
    updateCartToLocalStorage([{ id: 'p1', quantity: 1 }]);
    expect(clearCartFromLocalStorage()).toBe(true);
    expect(getCartFromLocalStorage()).toEqual([]);
  });
});

describe('guest cart merge marker (idempotent guest -> backend sync)', () => {
  it('is unset by default', () => {
    expect(isGuestCartMergePending()).toBe(false);
  });

  it('round-trips set/clear', () => {
    markGuestCartMerged();
    expect(isGuestCartMergePending()).toBe(true);
    clearGuestCartMergeMarker();
    expect(isGuestCartMergePending()).toBe(false);
  });
});

describe('buy-now item', () => {
  it('returns null when nothing is stored', () => {
    expect(getBuyNowItem()).toBeNull();
  });

  it('stores only the fields the cart flow needs, defaulting quantity to 1', () => {
    const product = { id: 'p1', name: 'Helmet', price: 1500, images: ['helmet.jpg'] };
    setBuyNowItem(product);
    expect(getBuyNowItem()).toEqual({
      id: 'p1',
      name: 'Helmet',
      price: 1500,
      quantity: 1,
      image: 'helmet.jpg',
    });
  });

  it('stores an explicit quantity when given', () => {
    setBuyNowItem({ id: 'p1', name: 'Helmet', price: 1500, images: [] }, 3);
    expect(getBuyNowItem().quantity).toBe(3);
  });

  it('clearBuyNowItem removes the stored intent', () => {
    setBuyNowItem({ id: 'p1', name: 'Helmet', price: 1500, images: [] });
    clearBuyNowItem();
    expect(getBuyNowItem()).toBeNull();
  });

  it('returns null (not a throw) for corrupted JSON', () => {
    window.localStorage.setItem('buyNow', '{not-json');
    expect(getBuyNowItem()).toBeNull();
  });
});
