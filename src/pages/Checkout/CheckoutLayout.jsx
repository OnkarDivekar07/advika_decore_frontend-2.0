// src/pages/Checkout/CheckoutLayout.jsx — Advika Auto Checkout shell
// See design_handoff_advika_auto/README.md, screen 6 "Checkout". Steps
// are real routes (/checkout, /checkout/review, /checkout/payment), not
// internal state, per the handoff's own build note. All draft-order /
// BuyNowFold logic below is unchanged from before the reskin — only the
// header/stepper markup is new.
import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import { LanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutProvider } from '@/contexts/CheckoutContext';
import Spinner from '@/components/Shared/Spinner';
import { handleError } from '@/utils/errorHandler';

const STEPS = ['address', 'review', 'payment'];

function BuyNowFold({ children }) {
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
      <div className="flex justify-center py-24">
        <Spinner size={40} />
      </div>
    );
  }
  return children;
}

function StepIndicator() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const activeIndex = pathname.startsWith('/checkout/payment') ? 2 : pathname.startsWith('/checkout/review') ? 1 : 0;

  return (
    <div className="flex items-center gap-[6px] px-4 pb-[18px]">
      {STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-[7px]">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isDone ? 'bg-advika-success text-white' : isActive ? 'bg-advika-orange text-white' : 'bg-[#2e2e2e] text-[#8b8681]'
                }`}
              >
                {isDone ? <Icon name="check" size={13} /> : index + 1}
              </span>
              <span className={`text-[12px] font-semibold ${isDone ? 'text-advika-success-bright' : isActive ? 'text-white' : 'text-advika-grey700'}`}>
                {t(`checkout.step.${step}`, step[0].toUpperCase() + step.slice(1))}
              </span>
            </div>
            {index < STEPS.length - 1 && <span className="h-px flex-1 bg-[#333]" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function CheckoutLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring } = useAuth();
  const { items: cartItems, isSyncing } = useCart();

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      navigate('/cart', { replace: true });
    }
  }, [isRestoring, isAuthenticated, navigate]);

  if (isRestoring || !isAuthenticated) return null;

  return (
    <div className="aa-shell min-h-screen bg-white">
      <Seo title={t('checkout.title', 'Checkout')} noindex />

      <div className="flex flex-col gap-4 bg-advika-near-black px-4 pb-[18px] pt-[22px]">
        <div className="flex items-center justify-between">
          <h1 className="aa-title-md text-white">{t('checkout.title', 'CHECKOUT')}</h1>
          <div className="flex items-center gap-2">
            <LanguageContext.Consumer>
              {({ language, changeLanguage }) => (
                <div className="flex overflow-hidden rounded border border-advika-border-dark4">
                  {['en', 'hi', 'mr'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => changeLanguage(code)}
                      className={`aa-mono flex h-7 min-w-[26px] items-center justify-center px-1.5 text-[10px] font-semibold ${
                        language === code ? 'bg-advika-orange text-white' : 'text-advika-grey600'
                      }`}
                    >
                      {t(`advika.header.lang${code === 'en' ? 'En' : code === 'hi' ? 'Hi' : 'Mr'}`)}
                    </button>
                  ))}
                </div>
              )}
            </LanguageContext.Consumer>
            {/* README's nav map: "the header home icon is present on all
                ten screens, including login" — Checkout.dc.html shows a
                compact home + close pair beside the language switcher. */}
            <Link to="/" aria-label={t('common.home', 'Home')} className="text-advika-grey600">
              <Icon name="home" size={21} />
            </Link>
            <Link to="/cart" aria-label={t('common.close', 'Close')} className="text-advika-grey600">
              <Icon name="close" size={21} />
            </Link>
          </div>
        </div>
      </div>
      <div className="bg-advika-near-black">
        <StepIndicator />
      </div>

      <CheckoutProvider>
        <BuyNowFold>
          {isSyncing ? (
            <div className="flex justify-center py-24">
              <Spinner size={40} />
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <p className="text-advika-grey700">{t('checkout.emptyCart', "Your cart is empty — there's nothing to check out.")}</p>
              <button type="button" onClick={() => navigate('/cart')} className="h-11 bg-advika-orange px-6 text-[13px] font-bold text-white">
                {t('cart.title', 'Your Cart')}
              </button>
            </div>
          ) : (
            <div className="px-4 py-4">
              <Outlet />
            </div>
          )}
        </BuyNowFold>
      </CheckoutProvider>
    </div>
  );
}
