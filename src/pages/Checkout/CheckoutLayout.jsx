// src/pages/Checkout/CheckoutLayout.jsx
//
// Parent route for /checkout/* (see AppRoutes.jsx). Mounting
// CheckoutProvider here — once, above the nested address/review/payment
// routes — is what lets selecting an address on step 1 still be there by
// the time later steps render: React Router keeps this layout mounted
// across a same-subtree navigation, it only swaps the <Outlet/> content.
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar/Navbar';
import Seo from '@/components/Shared/Seo';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutProvider } from '@/contexts/CheckoutContext';
import Spinner from '@/components/Shared/Spinner';
import { handleError } from '@/utils/errorHandler';
import CheckoutStepper from './CheckoutStepper';

function BuyNowFold({ children }) {
  // "Buy Now" bypasses the persistent cart (see CartContext.jsx), but the
  // backend's draft-order pipeline only ever prices what's in the cart
  // (checkout-architecture.md §4, gap 4 — extending POST /api/order to
  // accept an explicit line item is a backend change, not in scope here).
  // Folding the Buy Now item into the cart the moment checkout is entered
  // means it still goes through the real draft-order/payment pipeline
  // (server-side price/stock re-validation included) instead of the old
  // page's client-computed total. Runs once per checkout visit.
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { buyNowItem, clearBuyNow, addItem } = useCart();
  const foldedRef = useRef(false);
  const [isFolding, setIsFolding] = useState(
    searchParams.get('mode') === 'buyNow' && !!buyNowItem
  );

  useEffect(() => {
    const isBuyNow = searchParams.get('mode') === 'buyNow';
    if (!isBuyNow || !buyNowItem || foldedRef.current) {
      setIsFolding(false);
      return;
    }
    foldedRef.current = true;
    (async () => {
      try {
        await addItem(
          { id: buyNowItem.id, name: buyNowItem.name, price: buyNowItem.price, images: [buyNowItem.image] },
          buyNowItem.quantity
        );
        clearBuyNow();
      } catch (error) {
        // addItem already rolled back its own optimistic state on
        // failure (see CartContext.recoverFromMutationError) — nothing
        // partial is left behind. Send them back to the product/cart
        // rather than stranding them on a checkout page with nothing to
        // check out.
        handleError(error, "Couldn't start checkout with this item. Please try again.");
        navigate('/cart', { replace: true });
      } finally {
        setIsFolding(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isFolding) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Spinner size={40} />
      </div>
    );
  }
  return children;
}

export default function CheckoutLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { items: cartItems, isSyncing } = useCart();

  // Belt-and-suspenders: someone landing here directly via URL without a
  // verified session gets sent back to the cart, where the normal
  // requireAuth() gate will catch them.
  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      navigate('/cart', { replace: true });
    }
  }, [isRestoring, isAuthenticated, navigate]);

  if (isRestoring || !isAuthenticated) return null;

  return (
    <>
      <Navbar />
      {/* Same noindex declaration covers every nested step (Address/
          Review/Payment all render inside this layout's <Outlet />) — an
          in-progress checkout has nothing worth indexing and shouldn't
          be a landing page from search results. */}
      <Seo title={t('checkout.title', 'Checkout')} noindex />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12" id="main-content" tabIndex={-1}>
        <h1 className="section-title mb-2">{t('checkout.title', 'Checkout')}</h1>
        <p className="text-sm text-gray-500 mb-6">Verified as +91 {user?.phone}</p>

        <CheckoutStepper />

        <CheckoutProvider>
          <BuyNowFold>
            {isSyncing ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <Spinner size={40} />
              </div>
            ) : cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <p className="text-gray-500">
                  {t('checkout.emptyCart', "Your cart is empty — there's nothing to check out.")}
                </p>
                <button onClick={() => navigate('/cart')} className="btn btn-primary px-6">
                  {t('cart.title', 'Your Cart')}
                </button>
              </div>
            ) : (
              <Outlet />
            )}
          </BuyNowFold>
        </CheckoutProvider>
      </main>
    </>
  );
}
