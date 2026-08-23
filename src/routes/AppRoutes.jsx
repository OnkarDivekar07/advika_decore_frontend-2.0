// src/routes/AppRoutes.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Spinner from '@/components/Shared/Spinner';

const HomePage          = lazy(() => import('@/pages/Home/HomePage'));
const CartPage          = lazy(() => import('@/pages/Cart/CartPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetail/ProductDetailPage'));
const LoginPage          = lazy(() => import('@/pages/Login/LoginPage'));
const VehiclePage        = lazy(() => import('@/pages/Vehicle/VehiclePage'));
const CheckoutLayout     = lazy(() => import('@/pages/Checkout/CheckoutLayout'));
const AddressSelectionPage = lazy(() => import('@/pages/AddressSelection/AddressSelectionPage'));
const AddressBookPage = lazy(() => import('@/pages/Addresses/AddressBookPage'));
const ReviewPage        = lazy(() => import('@/pages/Review/ReviewPage'));
const PaymentPage        = lazy(() => import('@/pages/Payment/PaymentPage'));
const OrderSuccessPage   = lazy(() => import('@/pages/OrderSuccess/OrderSuccessPage'));
const OrderTrackingPage  = lazy(() => import('@/pages/OrderTracking/OrderTrackingPage'));
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
        {/* :slug is optional and purely cosmetic — ProductDetailPage
            always fetches by :id alone (see services/productsService),
            so a missing/stale/mismatched slug still resolves correctly.
            It exists only so links look like /product/123/blue-cover
            instead of a bare id (see seo/seoUtils#buildProductPath),
            which every internal <Link> now generates. Old bookmarked/
            shared /product/:id links keep working unchanged. */}
        <Route path="/product/:id/:slug?" element={<ProductDetailPage />} />
        <Route path="/cart"        element={<CartPage />} />
        {/* Legacy pre-reskin OTP page — superseded by /login's own OTP
            step (design_handoff_advika_auto/README.md screen 7 is a
            single white-shell Login/Signup screen, not two competing
            implementations). Redirected rather than dropped so an old
            bookmark/SMS deep link still lands somewhere real. */}
        <Route path="/otp-verification" element={<Navigate to="/login" replace />} />
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/vehicle/:classId" element={<VehiclePage />} />
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
        {/* Durable Track Order screen (README screen 10) — see
            OrderTrackingPage.jsx's header comment for why this is a
            separate, :orderId-driven route rather than reusing
            /order/success/:orderId's router `state`. */}
        <Route path="/orders/:orderId/track" element={<OrderTrackingPage />} />
        {/* README's Account screen (8) has an Orders tab, but "My orders"
            is view-only there (list + link to tracking) — OrderListPage
            offered nothing functionally beyond that, just legacy Navbar
            styling, so it's redirected rather than kept as a second,
            divergent implementation. Addresses is different: the
            Account tab is read-only (list + "Edit"/"Add new" links out),
            while AddressBookPage is where add/edit/delete/set-default
            actually happen (AddressForm + useAddressBook's mutations) —
            that real functionality is kept at its own route, just
            restyled into the Advika Auto shell (see AddressBookPage.jsx). */}
        <Route path="/addresses" element={<AddressBookPage />} />
        <Route path="/orders" element={<Navigate to="/profile?tab=orders" replace />} />
        <Route path="/search"      element={<SearchResultsPage />} />
        <Route path="/products"    element={<ProductListingPage />} />
        <Route path="/profile"    element={<UserProfilePage />} />
        <Route path="/wishlist"   element={<WishlistPage />} />
        <Route path="*"            element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
