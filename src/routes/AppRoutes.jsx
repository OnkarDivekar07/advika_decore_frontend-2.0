// src/routes/AppRoutes.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Spinner from '@/components/Shared/Spinner';

const HomePage          = lazy(() => import('@/pages/Home/HomePage'));
const CartPage          = lazy(() => import('@/pages/Cart/CartPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetail/ProductDetailPage'));
const NotFound          = lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Spinner size={48} />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"           element={<HomePage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart"        element={<CartPage />} />
        {/* Uncomment when pages are ready */}
        {/* <Route path="/profile"    element={<UserProfilePage />} /> */}
        {/* <Route path="/wishlist"   element={<WishlistPage />} /> */}
        {/* <Route path="/checkout"   element={<CheckoutPage />} /> */}
        <Route path="*"            element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
