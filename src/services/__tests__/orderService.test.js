import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/utils/apiClient';
import {
  createOrUpdateDraftOrder,
  getDraftOrder,
  getOrderHistory,
  getOrderById,
} from '@/services/orderService';

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
});

describe('createOrUpdateDraftOrder', () => {
  it('posts just the address when no coupon is given', async () => {
    apiClient.post.mockResolvedValue({ data: { data: { id: 'order1' } } });
    const result = await createOrUpdateDraftOrder('addr1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/order', { selectedAddressId: 'addr1' });
    expect(result).toEqual({ id: 'order1' });
  });

  it('includes the coupon code when provided', async () => {
    apiClient.post.mockResolvedValue({ data: { data: { id: 'order1' } } });
    await createOrUpdateDraftOrder('addr1', 'SAVE10');
    expect(apiClient.post).toHaveBeenCalledWith('/api/order', {
      selectedAddressId: 'addr1',
      couponCode: 'SAVE10',
    });
  });

  it('omits couponCode entirely (not sent as null) when explicitly null', async () => {
    apiClient.post.mockResolvedValue({ data: { data: {} } });
    await createOrUpdateDraftOrder('addr1', null);
    const [, body] = apiClient.post.mock.calls[0];
    expect(body).not.toHaveProperty('couponCode');
  });
});

describe('getDraftOrder', () => {
  it('returns the draft order when one exists', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { id: 'order1' } } });
    const result = await getDraftOrder();
    expect(result).toEqual({ id: 'order1' });
  });

  it('treats a 404 as "no draft order" (null), not an error', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 404 } });
    const result = await getDraftOrder();
    expect(result).toBeNull();
  });

  it('rethrows a non-404 failure', async () => {
    const error = { response: { status: 500 } };
    apiClient.get.mockRejectedValue(error);
    await expect(getDraftOrder()).rejects.toBe(error);
  });
});

describe('getOrderHistory', () => {
  it('defaults to page 1 / limit 10', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
    await getOrderHistory();
    expect(apiClient.get).toHaveBeenCalledWith('/api/order/history', { params: { page: 1, limit: 10 } });
  });

  it('forwards a custom page/limit', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [], meta: {} } });
    await getOrderHistory({ page: 3, limit: 5 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/order/history', { params: { page: 3, limit: 5 } });
  });

  it('defaults orders/meta to safe empty values on a bare envelope', async () => {
    apiClient.get.mockResolvedValue({ data: {} });
    const result = await getOrderHistory();
    expect(result).toEqual({ orders: [], meta: {} });
  });
});

describe('getOrderById', () => {
  it('fetches a single order by id', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { id: 'order1', status: 'delivered' } } });
    const result = await getOrderById('order1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/order/order1');
    expect(result.status).toBe('delivered');
  });

  it('propagates a 404 (not found) rather than swallowing it', async () => {
    const error = { response: { status: 404 } };
    apiClient.get.mockRejectedValue(error);
    await expect(getOrderById('missing')).rejects.toBe(error);
  });

  it('propagates a 403 (belongs to someone else)', async () => {
    const error = { response: { status: 403 } };
    apiClient.get.mockRejectedValue(error);
    await expect(getOrderById('not-mine')).rejects.toBe(error);
  });
});
