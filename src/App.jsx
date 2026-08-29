// src/App.jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGateProvider } from '@/contexts/AuthGateContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import GlobalSeo from '@/components/Shared/GlobalSeo';
import OfflineBanner from '@/components/Shared/OfflineBanner';
import ScrollToTop from '@/components/Shared/ScrollToTop';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    // HelmetProvider sits at the very top — every <Seo>/<GlobalSeo> call
    // anywhere in the tree needs to be inside it, and it has no
    // dependency on the other providers below.
    <HelmetProvider>
    <GlobalSeo />
    <OfflineBanner />
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
          {/* WishlistProvider only needs AuthContext (for isAuthenticated),
              not the router — sits alongside CartProvider so every routed
              page shares one wishlist, same reasoning as the cart. */}
          <WishlistProvider>
          <LanguageProvider>
            <Router>
              <ScrollToTop />
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
          </WishlistProvider>
        </CartProvider>
      </PricingProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}
