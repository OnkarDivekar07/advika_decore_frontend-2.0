// src/routes/AppRoutes.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Spinner from '@/components/Shared/Spinner';

const HomePage          = lazy(() => import('@/pages/Home/HomePage'));
const CartPage          = lazy(() => import('@/pages/Cart/CartPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetail/ProductDetailPage'));
const OTPVerificationPage = lazy(() => import('@/pages/OTPVerification/OTPVerificationPage'));
const CheckoutLayout     = lazy(() => import('@/pages/Checkout/CheckoutLayout'));
const AddressSelectionPage = lazy(() => import('@/pages/AddressSelection/AddressSelectionPage'));
const AddressBookPage = lazy(() => import('@/pages/Addresses/AddressBookPage'));
const OrderListPage = lazy(() => import('@/pages/Orders/OrderListPage'));
const ReviewPage        = lazy(() => import('@/pages/Review/ReviewPage'));
const PaymentPage        = lazy(() => import('@/pages/Payment/PaymentPage'));
const OrderSuccessPage   = lazy(() => import('@/pages/OrderSuccess/OrderSuccessPage'));
const SearchResultsPage = lazy(() => import('@/pages/Search/SearchResultsPage'));
const ProductListingPage = lazy(() => import('@/pages/Products/ProductListingPage'));
const UserProfilePage = lazy(() => import('@/pages/UserProfile/UserProfilePage'));
const WishlistPage = lazy(() => import('@/pages/Wishlist/WishlistPage'));
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
        <Route path="/otp-verification" element={<OTPVerificationPage />} />
        {/* CheckoutLayout mounts CheckoutProvider once for both nested
            steps, so the selected address / draft order survive moving
            from address -> review -> payment (see CheckoutLayout.jsx).
            Address, Review, and Payment are the only valid steps — no
            shipping-method step here; delivery is handled entirely by the
            delivery API behind the draft order's deliveryCharge. Any
            other /checkout/* path (typo, stale bookmark, an old
            /checkout/shipping link) falls through to the catch-all below
            and is sent back to the address step rather than rendering a
            blank layout. */}
        <Route path="/checkout" element={<CheckoutLayout />}>
          <Route index          element={<AddressSelectionPage />} />
          <Route path="review"  element={<ReviewPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="*"       element={<Navigate to="/checkout" replace />} />
        </Route>
        <Route path="/order/success/:orderId" element={<OrderSuccessPage />} />
        <Route path="/addresses" element={<AddressBookPage />} />
        <Route path="/orders" element={<OrderListPage />} />
        <Route path="/search"      element={<SearchResultsPage />} />
        <Route path="/products"    element={<ProductListingPage />} />
        <Route path="/profile"    element={<UserProfilePage />} />
        <Route path="/wishlist"   element={<WishlistPage />} />
        <Route path="*"            element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
