import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedCheckoutState,
  saveCheckoutState,
  clearSavedCheckoutState,
} from '@/utils/checkoutStorage';

const KEY = 'checkoutState';

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('getSavedCheckoutState', () => {
  it('returns null when nothing is saved', () => {
    expect(getSavedCheckoutState()).toBeNull();
  });

  it('returns null when there is no selectedAddressId (nothing safe to resume)', () => {
    window.sessionStorage.setItem(KEY, JSON.stringify({ step: 'review' }));
    expect(getSavedCheckoutState()).toBeNull();
  });

  it('self-heals from corrupted JSON', () => {
    window.sessionStorage.setItem(KEY, '{not-json');
    expect(getSavedCheckoutState()).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('falls back invalid step/paymentMethod values to their defaults', () => {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ selectedAddressId: 'addr1', step: 'bogus-step', paymentMethod: 'bitcoin' })
    );
    const saved = getSavedCheckoutState();
    expect(saved.step).toBe('address');
    expect(saved.paymentMethod).toBe('online');
  });
});

describe('saveCheckoutState', () => {
  it('persists only allow-listed keys, dropping anything else', () => {
    saveCheckoutState({
      selectedAddressId: 'addr1',
      step: 'review',
      cardNumber: '4111111111111111', // must never be persisted
      total: 999, // authoritative money value — must never be persisted
    });
    const raw = JSON.parse(window.sessionStorage.getItem(KEY));
    expect(raw.selectedAddressId).toBe('addr1');
    expect(raw.step).toBe('review');
    expect(raw).not.toHaveProperty('cardNumber');
    expect(raw).not.toHaveProperty('total');
  });

  it('shallow-merges into whatever is already saved', () => {
    saveCheckoutState({ selectedAddressId: 'addr1', step: 'address' });
    saveCheckoutState({ step: 'review' });
    const saved = getSavedCheckoutState();
    expect(saved.selectedAddressId).toBe('addr1');
    expect(saved.step).toBe('review');
  });

  it('round-trips reviewConfirmed and paymentMethod', () => {
    saveCheckoutState({ selectedAddressId: 'addr1', reviewConfirmed: true, paymentMethod: 'cod' });
    const saved = getSavedCheckoutState();
    expect(saved.reviewConfirmed).toBe(true);
    expect(saved.paymentMethod).toBe('cod');
  });

  it('round-trips pendingPaymentOrderId', () => {
    saveCheckoutState({ selectedAddressId: 'addr1', pendingPaymentOrderId: 'order-42' });
    const saved = getSavedCheckoutState();
    expect(saved.pendingPaymentOrderId).toBe('order-42');
  });
});

describe('clearSavedCheckoutState', () => {
  it('removes everything saved', () => {
    saveCheckoutState({ selectedAddressId: 'addr1' });
    clearSavedCheckoutState();
    expect(getSavedCheckoutState()).toBeNull();
  });
});
