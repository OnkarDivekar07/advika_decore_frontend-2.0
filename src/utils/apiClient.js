// src/utils/apiClient.js
import axios from 'axios';
import env from '@/utils/env';
import { getToken, clearToken } from '@/utils/authUtils';

const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
});

// --- Attach the JWT to every outgoing request, if a still-valid one is
// present. `getToken()` itself already discards an expired token, so an
// expired session never even reaches the network. ----------------------
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Session-expiry handling ---------------------------------------------
// The backend's own `authenticate.js` isn't fully consistent: it returns
// 401 when no token is sent, but 400 ("Invalid token.") for both a
// malformed *and* an expired token. We treat both cases as "the session
// is no longer valid" so expired tokens are handled correctly without
// requiring a backend contract change — while leaving genuine 400
// validation errors (e.g. a bad phone number) alone by matching on the
// specific message the backend uses for auth failures.
const AUTH_FAILURE_MESSAGES = [
  'invalid token',
  'access denied',
  'no token provided',
  'jwt expired',
  'jwt malformed',
];

function looksLikeAuthFailure(error) {
  const status = error.response?.status;
  if (status === 401) return true;
  if (status !== 400) return false;

  const message = (
    error.response?.data?.error ||
    error.response?.data?.message ||
    ''
  ).toLowerCase();
  return AUTH_FAILURE_MESSAGES.some((needle) => message.includes(needle));
}

// AuthContext registers itself here on mount so this plain module can
// notify React state without importing a context/hook into a non-React
// file. If nothing has registered yet (e.g. a request fails before the
// app has mounted), we still fall back to clearing storage directly so a
// dead token never lingers.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (looksLikeAuthFailure(error) && !error.config?.__skipAuthHandling) {
      if (unauthorizedHandler) unauthorizedHandler();
      else clearToken();
    }
    return Promise.reject(error);
  }
);

// --- Duplicate in-flight request prevention -----------------------------
// Guards against double-submits (double-tap on mobile, a slow network
// making a second click land before the first request's button-disable
// takes effect, React StrictMode re-invocation, etc.) at the network
// layer — a backstop underneath each screen's own `isSubmitting` guard
// rather than a replacement for it. Applied only to POST/PUT/PATCH: an
// identical request already in flight is not re-sent; callers instead
// receive the *same* promise/result as the original.
//
// Implemented by wrapping each verb method directly (rather than the
// shared internal `request()`) because axios's convenience methods
// (`post`/`put`/`patch`) resolve `this.request` through their own
// prototype binding, not through `apiClient`'s own properties — so
// overriding `apiClient.request` alone would silently miss every call
// made as `apiClient.post(...)`, which is how every service in this app
// calls it.
const inFlightRequests = new Map();

const buildRequestKey = (method, url, data) => {
  const body = typeof data === 'string' ? data : JSON.stringify(data ?? '');
  return `${method}:${url}:${body}`;
};

const dedupe = (method, originalFn) => (url, data, config = {}) => {
  if (config.__skipDedupe) return originalFn(url, data, config);

  const key = buildRequestKey(method, url, data);
  const existing = inFlightRequests.get(key);
  if (existing) return existing;

  const promise = originalFn(url, data, config).finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
};

apiClient.post = dedupe('post', apiClient.post.bind(apiClient));
apiClient.put = dedupe('put', apiClient.put.bind(apiClient));
apiClient.patch = dedupe('patch', apiClient.patch.bind(apiClient));

export default apiClient;
