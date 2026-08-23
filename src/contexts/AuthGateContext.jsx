// src/contexts/AuthGateContext.jsx
//
// Implements the "browse first, verify only when you actually try to buy"
// rule in one place. Any component can call `requireAuth(fn)`: if the user
// is already authenticated, fn runs immediately; otherwise the phone/OTP
// modal opens, and fn runs automatically right after a successful verify.
// Nothing about product browsing or add-to-cart should ever call this.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PhoneOtpModal from '@/components/Auth/PhoneOtpModal';

const AuthGateContext = createContext(null);

export function AuthGateProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  // Holds the callback queued while the modal is open, without putting a
  // function into React state (which would need a setter-function guard).
  const pendingAction = useRef(null);

  const requireAuth = useCallback(
    (action) => {
      if (isAuthenticated) {
        action?.();
        return;
      }
      pendingAction.current = action;
      setIsOpen(true);
    },
    [isAuthenticated]
  );

  const handleVerified = useCallback(() => {
    setIsOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    // Let the modal's close animation/unmount settle before navigating.
    if (action) setTimeout(action, 0);
  }, []);

  const handleClose = useCallback(() => {
    pendingAction.current = null;
    setIsOpen(false);
  }, []);

  // Memoized so consumers don't re-render just because some unrelated
  // state elsewhere caused this provider to render again.
  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <PhoneOtpModal isOpen={isOpen} onClose={handleClose} onVerified={handleVerified} />
    </AuthGateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- provider and hook are intentionally colocated
export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useAuthGate must be used within an AuthGateProvider');
  return ctx;
}
