// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import i18n from '@/i18n/index';
import {
  getToken,
  saveToken,
  clearToken,
  getStoredUser,
  saveUser,
  clearUser,
} from '@/utils/authUtils';
import { getTokenExpiryMs, isTokenExpired } from '@/utils/jwt';
import { sendOtp, verifyOtp } from '@/services/authService';
import { setUnauthorizedHandler } from '@/utils/apiClient';
import { fromE164 } from '@/utils/phoneValidation';

// eslint-disable-next-line react-refresh/only-export-components -- provider and context are intentionally colocated
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // `isRestoring` starts true and flips to false once we've checked
  // storage for a token and validated it isn't already expired. Kept as
  // a real (if synchronous-ish) step, not a hardcoded constant, because
  // CartContext/CheckoutPage gate their own logic on it and expect it to
  // reflect a genuine "have we figured out the session yet?" state.
  const [isRestoring, setIsRestoring] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const logoutTimerRef = useRef(null);

  const scheduleAutoLogout = useCallback((currentToken, reason = 'expired') => {
    clearTimeout(logoutTimerRef.current);
    const expiryMs = getTokenExpiryMs(currentToken);
    if (expiryMs === null) return;

    const msUntilExpiry = expiryMs - Date.now();
    if (msUntilExpiry <= 0) return; // already expired, caller handles that case

    logoutTimerRef.current = setTimeout(() => {
      endSession(reason);
    }, msUntilExpiry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Central place that clears session state, regardless of why: manual
  // logout, token expiring while the tab is open, or the backend
  // rejecting a request as unauthorized/expired mid-session.
  const endSession = useCallback((reason) => {
    clearTimeout(logoutTimerRef.current);
    clearToken();
    clearUser();
    setToken(null);
    setUser(null);

    if (reason === 'expired' || reason === 'unauthorized') {
      toast[reason === 'expired' ? 'info' : 'error'](
        reason === 'expired'
          ? i18n.t('session.expired', 'Your session has expired. Please verify your number again.')
          : i18n.t('session.invalid', 'Your session is no longer valid. Please sign in again.')
      );
      // AuthProvider sits above the router, so it can't use useNavigate —
      // fall back to a hard redirect, guarded against looping if the
      // user is already on the login screen.
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/otp-verification'
      ) {
        window.location.href = '/otp-verification';
      }
    }
  }, []);

  // Restore session on mount / page refresh.
  useEffect(() => {
    const stored = getToken(); // already returns null if expired
    if (stored) {
      setToken(stored);
      // Restore identity alongside the token. If the token survived but
      // the cached user didn't (e.g. storage tampered with), fall back to
      // treating it as an anonymous-but-authenticated session rather than
      // forcing a re-login — the token itself is still valid.
      const storedUser = getStoredUser();
      if (storedUser) setUser(storedUser);
      scheduleAutoLogout(stored);
    }
    setIsRestoring(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let the plain (non-React) apiClient module notify us when the
  // backend rejects a request as unauthorized/expired, so it can clear
  // React state too (not just storage) and the UI updates immediately
  // instead of only on the next re-render that happens to read storage.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession('unauthorized'));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  const login = useCallback(
    (newToken, loggedInUser) => {
      if (!newToken || isTokenExpired(newToken)) {
        // Defensive: never adopt a token that's already unusable.
        endSession('expired');
        return;
      }
      setToken(newToken);
      saveToken(newToken);
      if (loggedInUser) {
        setUser(loggedInUser);
        saveUser(loggedInUser);
      }
      scheduleAutoLogout(newToken);
    },
    [endSession, scheduleAutoLogout]
  );

  const logout = useCallback(() => {
    endSession(null); // explicit logout — no "session expired" toast
  }, [endSession]);

  // requestOtp/confirmOtp take a full E.164 phone (e.g. "+91XXXXXXXXXX"),
  // matching how PhoneOtpModal/OTPVerificationPage call them.
  // authService.sendOtp/verifyOtp expect the bare 10-digit number and add
  // the +91 prefix themselves, so convert back here rather than
  // double-prefixing.
  const requestOtp = useCallback(async (fullPhone) => {
    return sendOtp(fromE164(fullPhone));
  }, []);

  const confirmOtp = useCallback(
    async (fullPhone, otp) => {
      const { token: newToken, user: verifiedUser } = await verifyOtp(
        fromE164(fullPhone),
        otp
      );
      login(newToken, verifiedUser);
      return verifiedUser;
    },
    [login]
  );

  useEffect(() => () => clearTimeout(logoutTimerRef.current), []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isRestoring,
        login,
        logout,
        requestOtp,
        confirmOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- provider and hook are intentionally colocated
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
