import { describe, it, expect } from 'vitest';
import { derivePaymentMethod, getPaymentStatusMeta } from '@/features/orders/utils/paymentStatus';

describe('derivePaymentMethod', () => {
  it('identifies a COD order by its payment_order_id prefix', () => {
    expect(derivePaymentMethod({ payment_order_id: 'cod-12345' })).toBe('cod');
  });

  it('treats anything else as online', () => {
    expect(derivePaymentMethod({ payment_order_id: 'order_rzp123' })).toBe('online');
    expect(derivePaymentMethod({})).toBe('online');
    expect(derivePaymentMethod(undefined)).toBe('online');
  });
});

describe('getPaymentStatusMeta', () => {
  it('flags a refunded order regardless of payment method', () => {
    const meta = getPaymentStatusMeta({ paymentStatus: 'refunded', payment_order_id: 'order_1' });
    expect(meta.group).toBe('refunded');
  });

  it('shows "Pay on Delivery" for a COD order still pending', () => {
    const meta = getPaymentStatusMeta({
      paymentStatus: 'cod_pending',
      payment_order_id: 'cod-1',
    });
    expect(meta.group).toBe('codPending');
  });

  it('shows paid for a successfully captured online payment', () => {
    const meta = getPaymentStatusMeta({ paymentStatus: 'paid', payment_order_id: 'order_1' });
    expect(meta.group).toBe('paid');
  });

  it.each(['failed', 'cancelled', 'timeout', 'unknown'])(
    'groups a "%s" paymentStatus as failed',
    (paymentStatus) => {
      const meta = getPaymentStatusMeta({ paymentStatus, payment_order_id: 'order_1' });
      expect(meta.group).toBe('failed');
    }
  );

  it.each(['pending', 'attempted', 'processing'])(
    'groups a "%s" paymentStatus as still processing',
    (paymentStatus) => {
      const meta = getPaymentStatusMeta({ paymentStatus, payment_order_id: 'order_1' });
      expect(meta.group).toBe('processing');
    }
  );

  it('falls back to unknown for an unrecognized/missing paymentStatus', () => {
    const meta = getPaymentStatusMeta({ payment_order_id: 'order_1' });
    expect(meta.group).toBe('unknown');
    expect(meta.fallback).toBe('Unknown');
  });

  it('does not confuse a COD order sitting at a non-cod_pending status with failure/processing incorrectly', () => {
    // e.g. a COD order that somehow has paymentStatus 'paid' (shouldn't
    // normally happen, but the mapping should still be sensible).
    const meta = getPaymentStatusMeta({ paymentStatus: 'paid', payment_order_id: 'cod-1' });
    expect(meta.group).toBe('paid');
  });
});
