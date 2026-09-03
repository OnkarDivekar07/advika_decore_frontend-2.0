import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/services/orderService', () => ({
  getOrderHistory: vi.fn(),
}));
vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn(),
}));

import * as orderService from '@/services/orderService';
import { handleError } from '@/utils/errorHandler';
import {
  useOrderHistory,
  STATUS_LOADING,
  STATUS_SUCCESS,
  STATUS_EMPTY,
  STATUS_ERROR,
} from '@/features/orders/hooks/useOrderHistory';

const order = (id) => ({ id, status: 'confirmed' });
const meta = (page, totalPages = 1) => ({ page, limit: 10, total: totalPages * 10, totalPages });

beforeEach(() => {
  orderService.getOrderHistory.mockReset();
  handleError.mockReset();
});

describe('initial load', () => {
  it('fetches page 1 and resolves to success', async () => {
    orderService.getOrderHistory.mockResolvedValue({
      orders: [order('o1'), order('o2')],
      meta: meta(1, 2),
    });

    const { result } = renderHook(() => useOrderHistory(1));
    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(result.current.orders).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);
  });

  it('resolves to empty when there are no orders', async () => {
    orderService.getOrderHistory.mockResolvedValue({ orders: [], meta: meta(1, 1) });
    const { result } = renderHook(() => useOrderHistory(1));
    await waitFor(() => expect(result.current.status).toBe(STATUS_EMPTY));
  });

  it('surfaces a failure as an error state', async () => {
    const error = new Error('down');
    orderService.getOrderHistory.mockRejectedValue(error);
    const { result } = renderHook(() => useOrderHistory(1));
    await waitFor(() => expect(result.current.status).toBe(STATUS_ERROR));
    expect(handleError).toHaveBeenCalledWith(error, "Couldn't load your orders.");
  });
});

describe('enabled option', () => {
  it('does not fetch while enabled is false, e.g. before auth is known', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useOrderHistory(1, { enabled }),
      { initialProps: { enabled: false } }
    );

    expect(orderService.getOrderHistory).not.toHaveBeenCalled();
    expect(result.current.status).toBe(STATUS_LOADING);

    orderService.getOrderHistory.mockResolvedValue({
      orders: [order('o1')],
      meta: meta(1, 1),
    });
    rerender({ enabled: true });

    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(orderService.getOrderHistory).toHaveBeenCalledTimes(1);
  });
});

describe('additive pagination (Load More)', () => {
  it('only requests the missing page(s) when the target page advances', async () => {
    orderService.getOrderHistory
      .mockResolvedValueOnce({ orders: [order('o1')], meta: meta(1, 2) })
      .mockResolvedValueOnce({ orders: [order('o2')], meta: meta(2, 2) });

    const { result, rerender } = renderHook(({ page }) => useOrderHistory(page), {
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(result.current.orders.map((o) => o.id)).toEqual(['o1']);

    rerender({ page: 2 });
    await waitFor(() => expect(result.current.orders).toHaveLength(2));
    expect(result.current.orders.map((o) => o.id)).toEqual(['o1', 'o2']);

    // Exactly 2 network calls total — page 2 only fetched page 2, not
    // re-fetched page 1 too.
    expect(orderService.getOrderHistory).toHaveBeenCalledTimes(2);
    expect(orderService.getOrderHistory.mock.calls[1][0]).toMatchObject({ page: 2 });
  });

  it('re-slices from memory (no network call) when navigating back to an already-loaded page', async () => {
    orderService.getOrderHistory
      .mockResolvedValueOnce({ orders: [order('o1')], meta: meta(1, 2) })
      .mockResolvedValueOnce({ orders: [order('o2')], meta: meta(2, 2) });

    const { result, rerender } = renderHook(({ page }) => useOrderHistory(page), {
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.orders).toHaveLength(2));
    expect(orderService.getOrderHistory).toHaveBeenCalledTimes(2);

    // Browser Back — already have everything needed in memory, so this
    // must re-slice locally rather than issuing a fresh network request.
    rerender({ page: 1 });
    expect(orderService.getOrderHistory).toHaveBeenCalledTimes(2); // unchanged — no new request
    // ORDER_HISTORY_PAGE_SIZE is 10, so with only 2 orders loaded total,
    // slicing to "page 1 worth" (up to 10) still shows both — the point
    // of this assertion is the call count above, not a length drop.
    expect(result.current.orders).toHaveLength(2);
  });

  it('reports hasMore=false once every page has been fetched', async () => {
    orderService.getOrderHistory.mockResolvedValue({ orders: [order('o1')], meta: meta(1, 1) });
    const { result } = renderHook(() => useOrderHistory(1));
    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(result.current.hasMore).toBe(false);
  });
});

describe('retry', () => {
  it('discards the in-memory cache and re-fetches from page 1', async () => {
    orderService.getOrderHistory
      .mockResolvedValueOnce({ orders: [order('o1')], meta: meta(1, 1) })
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce({ orders: [order('o1-fresh')], meta: meta(1, 1) });

    const { result, rerender } = renderHook(({ page }) => useOrderHistory(page), {
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));

    // Force a failure on the "next page" fetch, then retry.
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.status).toBe(STATUS_ERROR));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(result.current.orders.map((o) => o.id)).toEqual(['o1-fresh']);
  });
});
