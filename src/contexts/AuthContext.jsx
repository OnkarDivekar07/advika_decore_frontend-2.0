// src/contexts/AuthContext.jsx
//
// The single source of truth for "is anyone logged in". Nothing about
// browsing or cart depends on this — it only matters once the user hits
// a point that actually requires an identity (checkout). Session is a
// JWT issued by POST /api/otp/verify-otp, persisted to localStorage, and
// re-validated against GET /api/user/profile on load so a stale/expired
// token doesn't silently pretend to be a valid session.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authService from '@/services/authService';
import { STORAGE_KEYS, AUTH_EVENTS } from '@/utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  );
  // 'restoring' while we validate a persisted token, so consumers (e.g. a
  // route guard) can wait instead of flashing a logged-out state.
  const [status, setStatus] = useState(
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ? 'restoring' : 'guest'
  );

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, nextToken);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // Validate any persisted token once on load.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await authService.getProfile();
        if (!cancelled) {
          setUser(profile);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only ever run for the token we booted with; verifyOtp sets status
    // to 'authenticated' directly and doesn't need re-validation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any apiClient call that comes back 401 broadcasts this — react by
  // dropping the (now-invalid) session everywhere at once.
  useEffect(() => {
    window.addEventListener(AUTH_EVENTS.UNAUTHORIZED, clearSession);
    return () => window.removeEventListener(AUTH_EVENTS.UNAUTHORIZED, clearSession);
  }, [clearSession]);

  const requestOtp = useCallback(async (phone) => {
    await authService.sendOtp(phone);
  }, []);

  const confirmOtp = useCallback(
    async (phone, otp) => {
      const result = await authService.verifyOtp(phone, otp);
      persistSession(result.token, result.user);
      return result.user;
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: status === 'authenticated',
      isRestoring: status === 'restoring',
      requestOtp,
      confirmOtp,
      logout,
    }),
    [user, token, status, requestOtp, confirmOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
