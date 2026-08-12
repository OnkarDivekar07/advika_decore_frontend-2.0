// src/App.jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGateProvider } from '@/contexts/AuthGateContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { CartProvider } from '@/contexts/CartContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      {/* PricingProvider sits above CartProvider: CartContext's guest-mode
          summary fallback reads the backend-configured delivery rule via
          usePricing() (see CartContext.jsx), so it must be mounted first. */}
      <PricingProvider>
        {/* CartProvider reads auth state (isAuthenticated/isRestoring) to
            decide guest vs backend cart mode, so it must live inside
            AuthProvider. It doesn't need the router, but sits above it so
            every routed page — including Checkout — shares one cart. */}
        <CartProvider>
          <LanguageProvider>
            <Router>
              <AuthGateProvider>
                <AppRoutes />
              </AuthGateProvider>
              <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss={false}
                draggable
                pauseOnHover
                theme="colored"
              />
            </Router>
          </LanguageProvider>
        </CartProvider>
      </PricingProvider>
    </AuthProvider>
  );
}
