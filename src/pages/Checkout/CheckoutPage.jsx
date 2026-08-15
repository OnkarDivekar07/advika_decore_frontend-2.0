// src/pages/Checkout/CheckoutPage.jsx
//
// Reached only after mobile verification (via requireAuth in CartSummary
// / ProductDetails "Buy Now"). Address collection, shipping, and payment
// are separate upcoming modules — this page is the landing point for now:
// it confirms the verified session and shows what's being bought.
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { calculateDeliveryCharge } from '@/config/pricing';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { items: cartItems, buyNowItem, deliveryCharge, total, coupon } = useCart();

  const isBuyNow = searchParams.get('mode') === 'buyNow';
  const items = isBuyNow && buyNowItem ? [buyNowItem] : cartItems;

  // Belt-and-suspenders: someone landing here directly via URL without a
  // verified session gets sent back to the cart, where the normal
  // requireAuth() gate will catch them.
  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      navigate('/cart', { replace: true });
    }
  }, [isRestoring, isAuthenticated, navigate]);

  if (isRestoring || !isAuthenticated) return null;

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  // Buy Now bypasses the cart entirely (it's a single item, never synced
  // into CartContext's `items` or its backend-sourced `summary` — see
  // CartContext.jsx), so the backend has no cart to compute a summary
  // against for it. This is the one remaining legitimate use of
  // calculateDeliveryCharge on the frontend (see src/config/pricing.js) —
  // everywhere else, an authenticated cart's totals come straight from
  // the backend. Still just a preview either way: the real numbers are
  // computed server-side at draft-order creation (order.service.js),
  // which is what actually gets charged.
  //
  // Discount is cart-only for the same reason: a coupon preview was run
  // against the cart's subtotal, not a Buy Now item's, so it never applies
  // here.
  const effectiveDeliveryCharge = isBuyNow ? calculateDeliveryCharge(subtotal) : deliveryCharge;
  const discount = isBuyNow ? 0 : coupon.discount;
  const effectiveTotal = isBuyNow ? Math.max(0, subtotal + effectiveDeliveryCharge) : total;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12" id="main-content" tabIndex={-1}>
        <h1 className="section-title mb-2">{t('checkout.title', 'Checkout')}</h1>
        <p className="text-sm text-gray-500 mb-8">
          Verified as +91 {user?.phone}
        </p>

        <div className="card p-5 sm:p-6 flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-gray-900">Order Summary</h2>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-gray-600">
              <span>{typeof item.name === 'string' ? item.name : item.name?.en} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <hr className="border-[var(--clr-border)]" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t('cart.cartSubtotal', 'Cart Subtotal')}</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t('cart.deliveryCharge', 'Delivery Charge')}</span>
            {effectiveDeliveryCharge > 0 ? (
              <span>₹{effectiveDeliveryCharge.toFixed(2)}</span>
            ) : (
              <span className="text-green-600 font-medium">{t('cart.free', 'Free')}</span>
            )}
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>{t('cart.discount', 'Discount')} ({coupon.code})</span>
              <span>-₹{discount.toFixed(2)}</span>
            </div>
          )}
          <hr className="border-[var(--clr-border)]" />
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span className="text-primary text-xl">₹{effectiveTotal.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Address and payment are coming in the next module.
        </p>
      </main>
    </>
  );
}
