import { describe, it, expect, vi, beforeEach } from 'vitest';

// A custom axios adapter lets us fully control what "the network" returns
// without touching the real network, while still exercising apiClient's
// real request/response interceptors (auth header injection, session-
// expiry detection) and its dedupe wrapper around post/put/patch — the
// actual behavior under test, not a re-implementation of it.
const adapterMock = vi.fn();

vi.mock('@/utils/authUtils', () => ({
  getToken: vi.fn(() => null),
  clearToken: vi.fn(),
}));

import apiClient, { setUnauthorizedHandler } from '@/utils/apiClient';
import { getToken, clearToken } from '@/utils/authUtils';

function respond({ status = 200, data = {} } = {}) {
  return (config) =>
    Promise.resolve({
      data,
      status,
      statusText: 'OK',
      headers: {},
      config,
    });
}

function fail({ status, data = {} } = {}) {
  return (config) => {
    const error = new Error('Request failed');
    error.config = config;
    error.response = { status, data, headers: {}, config };
    return Promise.reject(error);
  };
}

beforeEach(() => {
  adapterMock.mockReset();
  apiClient.defaults.adapter = adapterMock;
  setUnauthorizedHandler(null);
});

describe('auth header attachment', () => {
  it('attaches a Bearer token when getToken() returns one', async () => {
    getToken.mockReturnValue('valid-token');
    adapterMock.mockImplementation(respond({ data: { ok: true } }));

    await apiClient.get('/api/whatever', { __skipDedupe: true });

    expect(adapterMock).toHaveBeenCalledTimes(1);
    expect(adapterMock.mock.calls[0][0].headers.Authorization).toBe('Bearer valid-token');
  });

  it('sends no Authorization header when there is no token', async () => {
    getToken.mockReturnValue(null);
    adapterMock.mockImplementation(respond({ data: { ok: true } }));

    await apiClient.get('/api/whatever', { __skipDedupe: true });

    const sentHeaders = adapterMock.mock.calls[0][0].headers;
    expect(sentHeaders.Authorization).toBeUndefined();
  });
});

describe('session-expiry handling', () => {
  it('calls the registered unauthorized handler on a 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    adapterMock.mockImplementation(fail({ status: 401, data: { message: 'No token provided' } }));

    await expect(apiClient.get('/api/protected', { __skipDedupe: true })).rejects.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('treats a 400 "invalid token" as a session failure too (backend inconsistency)', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    adapterMock.mockImplementation(fail({ status: 400, data: { message: 'Invalid token.' } }));

    await expect(apiClient.get('/api/protected', { __skipDedupe: true })).rejects.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not treat an unrelated 400 validation error as a session failure', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    adapterMock.mockImplementation(fail({ status: 400, data: { message: 'Phone number is invalid' } }));

    await expect(apiClient.post('/api/otp/send-otp', { phone: 'bad' })).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('falls back to clearing the token directly when no handler is registered', async () => {
    setUnauthorizedHandler(null);
    adapterMock.mockImplementation(fail({ status: 401, data: {} }));

    await expect(apiClient.get('/api/protected', { __skipDedupe: true })).rejects.toThrow();
    expect(clearToken).toHaveBeenCalledTimes(1);
  });

  it('skips unauthorized handling when the request opts out via __skipAuthHandling', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    adapterMock.mockImplementation(fail({ status: 401, data: {} }));

    await expect(
      apiClient.get('/api/protected', { __skipDedupe: true, __skipAuthHandling: true })
    ).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('duplicate in-flight request prevention (double-click / double-submit)', () => {
  it('collapses two identical concurrent POSTs into a single network call', async () => {
    let resolveAdapter;
    adapterMock.mockImplementation(
      (config) =>
        new Promise((resolve) => {
          resolveAdapter = () =>
            resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });
        })
    );

    const payload = { orderId: 'order-1', method: 'cod' };
    const first = apiClient.post('/api/payment/cod', payload);
    const second = apiClient.post('/api/payment/cod', payload);

    // Only one network call should have gone out for the two identical,
    // concurrent submits (e.g. a fast double-tap on "Place Order").
    // Axios resolves its interceptor chain over a few microtask hops
    // before ever reaching the adapter, so give those a chance to run.
    await vi.waitFor(() => expect(adapterMock).toHaveBeenCalledTimes(1));

    resolveAdapter();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult); // literally the same resolved response
  });

  it('does not dedupe two POSTs with different bodies', async () => {
    adapterMock.mockImplementation(respond({ data: { ok: true } }));

    await Promise.all([
      apiClient.post('/api/cart', { productId: 'a', quantity: 1 }),
      apiClient.post('/api/cart', { productId: 'b', quantity: 1 }),
    ]);

    expect(adapterMock).toHaveBeenCalledTimes(2);
  });

  it('allows a fresh request once the in-flight one has resolved', async () => {
    adapterMock.mockImplementation(respond({ data: { ok: true } }));

    await apiClient.post('/api/cart', { productId: 'a', quantity: 1 });
    await apiClient.post('/api/cart', { productId: 'a', quantity: 1 });

    expect(adapterMock).toHaveBeenCalledTimes(2);
  });

  it('does not dedupe GET requests (only POST/PUT/PATCH are wrapped)', async () => {
    adapterMock.mockImplementation(respond({ data: { ok: true } }));

    await Promise.all([
      apiClient.get('/api/cart', { __skipDedupe: true }),
      apiClient.get('/api/cart', { __skipDedupe: true }),
    ]);

    expect(adapterMock).toHaveBeenCalledTimes(2);
  });

  it('bypasses dedupe when a caller explicitly opts out via __skipDedupe', async () => {
    adapterMock.mockImplementation(respond({ data: { ok: true } }));

    const payload = { productId: 'a', quantity: 1 };
    await Promise.all([
      apiClient.post('/api/cart', payload, { __skipDedupe: true }),
      apiClient.post('/api/cart', payload, { __skipDedupe: true }),
    ]);

    expect(adapterMock).toHaveBeenCalledTimes(2);
  });

  it('a failed in-flight request does not poison later identical requests', async () => {
    adapterMock.mockImplementationOnce(fail({ status: 500, data: {} }));
    adapterMock.mockImplementationOnce(respond({ data: { ok: true } }));

    const payload = { productId: 'a', quantity: 1 };
    await expect(apiClient.post('/api/cart', payload)).rejects.toThrow();
    const result = await apiClient.post('/api/cart', payload);

    expect(result.data).toEqual({ ok: true });
    expect(adapterMock).toHaveBeenCalledTimes(2);
  });
});
