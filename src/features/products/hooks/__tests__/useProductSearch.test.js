import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/services/productsService', () => ({
  searchProducts: vi.fn(),
}));
vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn(),
}));

import { searchProducts } from '@/services/productsService';
import { handleError } from '@/utils/errorHandler';
import {
  useProductSearch,
  STATUS_IDLE,
  STATUS_LOADING,
  STATUS_SUCCESS,
  STATUS_EMPTY,
  STATUS_ERROR,
} from '@/features/products/hooks/useProductSearch';

const makeMeta = (overrides = {}) => ({ total: 1, page: 1, limit: 12, totalPages: 1, ...overrides });

beforeEach(() => {
  searchProducts.mockReset();
  handleError.mockReset();
});

describe('useProductSearch', () => {
  it('starts idle for an empty query and never calls the API', () => {
    const { result } = renderHook(() => useProductSearch(''));
    expect(result.current.status).toBe(STATUS_IDLE);
    expect(searchProducts).not.toHaveBeenCalled();
  });

  it('resolves to success with items for a query that returns results', async () => {
    searchProducts.mockResolvedValue({
      items: [{ id: 'p1', name: 'Brake Pad' }],
      meta: makeMeta(),
    });

    const { result } = renderHook(() => useProductSearch('brake pad'));

    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(result.current.items).toEqual([{ id: 'p1', name: 'Brake Pad' }]);
  });

  it('resolves to empty when the search returns zero results', async () => {
    searchProducts.mockResolvedValue({ items: [], meta: makeMeta({ total: 0 }) });

    const { result } = renderHook(() => useProductSearch('nonexistent-part'));

    await waitFor(() => expect(result.current.status).toBe(STATUS_EMPTY));
    expect(result.current.items).toEqual([]);
  });

  it('surfaces an API failure as an error state and reports it', async () => {
    const error = new Error('network down');
    searchProducts.mockRejectedValue(error);

    const { result } = renderHook(() => useProductSearch('brake pad'));

    await waitFor(() => expect(result.current.status).toBe(STATUS_ERROR));
    expect(handleError).toHaveBeenCalledWith(error, 'Could not load search results.');
  });

  it('falls through to a translated candidate when the raw query returns nothing', async () => {
    // A mixed-language query yields two candidates: the raw text first,
    // then the translated category word (see searchTermTranslation.js).
    // First candidate returns 0 results, second (translated) returns
    // real results — the hook should try both and land on the one that
    // actually matched.
    searchProducts
      .mockResolvedValueOnce({ items: [], meta: makeMeta({ total: 0 }) })
      .mockResolvedValueOnce({ items: [{ id: 'p1', name: 'Truck Part' }], meta: makeMeta() });

    const { result } = renderHook(() => useProductSearch('parts ट्रक'));

    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(result.current.items).toEqual([{ id: 'p1', name: 'Truck Part' }]);
    expect(searchProducts).toHaveBeenCalledTimes(2);
    expect(searchProducts.mock.calls[1][0]).toMatchObject({ search: 'Truck' });
  });

  it('skips a pure-Devanagari query straight to its translated candidate without a doomed raw request', async () => {
    searchProducts.mockResolvedValueOnce({
      items: [{ id: 'p1', name: 'Truck Part' }],
      meta: makeMeta(),
    });

    const { result } = renderHook(() => useProductSearch('ट्रक'));

    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
    expect(searchProducts).toHaveBeenCalledTimes(1);
    expect(searchProducts.mock.calls[0][0]).toMatchObject({ search: 'Truck' });
  });

  it('re-runs the search when the query changes', async () => {
    searchProducts.mockResolvedValue({ items: [{ id: 'p1' }], meta: makeMeta() });

    const { rerender } = renderHook(({ query }) => useProductSearch(query), {
      initialProps: { query: 'brake' },
    });
    await waitFor(() => expect(searchProducts).toHaveBeenCalledTimes(1));

    rerender({ query: 'clutch' });
    await waitFor(() => expect(searchProducts).toHaveBeenCalledTimes(2));
    expect(searchProducts.mock.calls[1][0]).toMatchObject({ search: 'clutch' });
  });

  it('clears results when the query is cleared back to empty', async () => {
    searchProducts.mockResolvedValue({ items: [{ id: 'p1' }], meta: makeMeta() });

    const { result, rerender } = renderHook(({ query }) => useProductSearch(query), {
      initialProps: { query: 'brake' },
    });
    await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));

    rerender({ query: '' });
    expect(result.current.status).toBe(STATUS_IDLE);
    expect(result.current.items).toEqual([]);
  });

  describe('loadMore (pagination)', () => {
    it('appends the next page of results to what is already loaded', async () => {
      searchProducts
        .mockResolvedValueOnce({
          items: [{ id: 'p1' }],
          meta: makeMeta({ page: 1, totalPages: 2 }),
        })
        .mockResolvedValueOnce({
          items: [{ id: 'p2' }],
          meta: makeMeta({ page: 2, totalPages: 2 }),
        });

      const { result } = renderHook(() => useProductSearch('brake'));
      await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.items).toEqual([{ id: 'p1' }, { id: 'p2' }]);
      expect(result.current.hasMore).toBe(false);
    });

    it('does nothing when there is no further page', async () => {
      searchProducts.mockResolvedValue({ items: [{ id: 'p1' }], meta: makeMeta({ totalPages: 1 }) });
      const { result } = renderHook(() => useProductSearch('brake'));
      await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(searchProducts).toHaveBeenCalledTimes(1); // no second call fired
    });

    it('keeps existing results visible if loading the next page fails', async () => {
      searchProducts
        .mockResolvedValueOnce({
          items: [{ id: 'p1' }],
          meta: makeMeta({ page: 1, totalPages: 2 }),
        })
        .mockRejectedValueOnce(new Error('timeout'));

      const { result } = renderHook(() => useProductSearch('brake'));
      await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.items).toEqual([{ id: 'p1' }]); // unchanged
      expect(result.current.status).toBe(STATUS_SUCCESS); // not thrown into an error state
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('re-fires the same query on demand', async () => {
      searchProducts.mockRejectedValueOnce(new Error('down'));
      const { result } = renderHook(() => useProductSearch('brake'));
      await waitFor(() => expect(result.current.status).toBe(STATUS_ERROR));

      searchProducts.mockResolvedValueOnce({ items: [{ id: 'p1' }], meta: makeMeta() });
      act(() => result.current.retry());

      await waitFor(() => expect(result.current.status).toBe(STATUS_SUCCESS));
      expect(searchProducts).toHaveBeenCalledTimes(2);
    });
  });
});
