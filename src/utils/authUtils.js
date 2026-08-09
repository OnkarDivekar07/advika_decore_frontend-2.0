// src/utils/authUtils.js
//
// Storage for the session's JWT.
//
// Deliberately `sessionStorage`, not `localStorage`:
//   - It's still JS-readable (no web storage is safe from XSS), but it is
//     scoped to the tab and cleared the moment the tab/browser closes —
//     so a token can't sit around indefinitely on a shared/public machine
//     the way a localStorage value would.
//   - The backend (see otp.service.js) only ever issues a short-lived
//     (1h) bearer JWT with no httpOnly-cookie or refresh-token endpoint,
//     so we can't get it out of JS-reachable storage entirely without a
//     backend contract change, which we've been asked to avoid.
//   - We compensate with `jwt.js`'s expiry check (so a stale/expired
//     token is treated as logged-out immediately, without waiting on an
//     API round trip) and by clearing it eagerly on logout, tab-close,
//     and any auth failure.
//
// This module is the ONLY place that touches storage for the token —
// everything else goes through AuthContext.
import { isTokenExpired } from './jwt';

export const AUTH_TOKEN_KEY = 'authToken';
// Stored alongside the token so a page refresh can restore *who* is
// signed in, not just that a (still-valid) token exists. The backend's
// verify-otp response is the only place `user` comes from (see
// authService.verifyOtp) — there's no separate /me endpoint to re-fetch
// it from, so it has to be cached client-side at login time.
export const AUTH_USER_KEY = 'authUser';

const hasSessionStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch {
    return false;
  }
};

/**
 * Read the stored token, but only if it isn't already expired — an
 * expired token is treated the same as no token at all, and is cleaned
 * up immediately so nothing stale lingers in storage.
 */
export const getToken = () => {
  if (!hasSessionStorage()) return null;
  const token = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearToken();
    return null;
  }
  return token;
};

export const saveToken = (token) => {
  if (!hasSessionStorage() || !token) return;
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearToken = () => {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

/**
 * Read the stored user object. Deliberately does NOT gate on token
 * validity itself — callers (AuthContext restore) already check
 * getToken() first and clear both together, so this just needs to not
 * blow up on missing/corrupt JSON.
 */
export const getStoredUser = () => {
  if (!hasSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Corrupt entry (e.g. hand-edited storage) — don't let it crash restore.
    window.sessionStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const saveUser = (user) => {
  if (!hasSessionStorage() || !user) return;
  try {
    window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore quota/serialization errors — identity restore is a UX nicety,
    // not something that should break the login flow.
  }
};

export const clearUser = () => {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(AUTH_USER_KEY);
};
