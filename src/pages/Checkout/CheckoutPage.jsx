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

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { items: cartItems, buyNowItem } = useCart();

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

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span className="text-primary text-xl">₹{subtotal.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-sm text-gray-400 mt-6">
          Address and payment are coming in the next module.
        </p>
      </main>
    </>
  );
}
