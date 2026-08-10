// src/components/Cart/CartSummary.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiAlertTriangle, FiTag, FiX } from 'react-icons/fi';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { useCart } from '@/contexts/CartContext';
import { getStockInfo } from '@/utils/productUtils';
import { FREE_DELIVERY_THRESHOLD } from '@/config/pricing';

export default function CartSummary({ items }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requireAuth } = useAuthGate();
  // subtotal/deliveryCharge/total/coupon all come from CartContext — for a
  // signed-in cart, straight from the backend's own summary (see
  // cart.controller.js's `meta.summary`), not recomputed here — so this
  // can never drift from what checkout will actually charge. `total` here
  // IS the final payable amount: subtotal + delivery - discount, never
  // anything computed independently.
  const { subtotal, deliveryCharge, total, coupon, applyCoupon, clearCoupon } = useCart();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const amountToFreeDelivery = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0);
  const [couponInput, setCouponInput] = useState('');

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim() || coupon.status === 'applying') return;
    applyCoupon(couponInput.trim());
  };

  const handleRemoveCoupon = () => {
    setCouponInput('');
    clearCoupon();
  };

  // Bulletproofing the checkout gate itself, not just the stepper: a
  // stock drop can land between page load and this click (another
  // customer buying the last unit, an admin adjustment, a guest-cart
  // revalidation dropping an item), so re-derive validity from the same
  // { stock } shape CartItem uses right here rather than trusting that
  // every render already reflects it.
  const hasUnavailableItem = items.some((item) => {
    const stock = getStockInfo({ stock: item.stock });
    return stock.quantity !== null && item.quantity > stock.quantity;
  });

  return (
    <aside
      className="card p-5 sm:p-6 sticky top-24 self-start w-full max-w-sm"
      aria-label="Order summary"
    >
      <h2 className="font-display text-xl font-bold text-gray-900 mb-5">Order Summary</h2>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{t('cart.cartCount', 'Cart Count')}</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{t('cart.cartSubtotal', 'Cart Subtotal')}</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{t('cart.deliveryCharge', 'Delivery Charge')}</span>
          {deliveryCharge > 0 ? (
            <span>₹{deliveryCharge.toFixed(2)}</span>
          ) : (
            <span className="text-green-600 font-medium">{t('cart.free', 'Free')}</span>
          )}
        </div>
        {/* Discount/coupon placeholder architecture — only shown once a
            coupon has actually been applied (discount > 0). No coupon
            system exists on the backend yet, so this line stays hidden
            in practice until one does — see cartService.previewCoupon. */}
        {coupon.status === 'applied' && coupon.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>{t('cart.discount', 'Discount')} ({coupon.code})</span>
            <span>-₹{coupon.discount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Nudge shown only while there's still a real gap to close, so it
          doesn't linger once free delivery already kicked in. */}
      {amountToFreeDelivery > 0 && (
        <p className="text-xs text-amber-600 mt-3">
          {t(
            'cart.freeDeliveryNudge',
            'Add ₹{{amount}} more to get free delivery.',
            { amount: amountToFreeDelivery.toFixed(2) }
          )}
        </p>
      )}

      <hr className="my-4 border-[var(--clr-border)]" />

      {/* Coupon input — preview-only against the live cart (see
          CartContext.applyCoupon). Cleared automatically if the cart
          changes underneath it, so it never shows a discount computed
          against a subtotal that no longer applies. */}
      <div className="mb-4">
        {coupon.status === 'applied' ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-medium">
              <FiTag className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {coupon.code}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-gray-400 hover:text-gray-600"
              aria-label={t('cart.removeCoupon', 'Remove coupon')}
            >
              <FiX className="w-4 h-4" aria-hidden />
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder={t('cart.couponPlaceholder', 'Have a coupon?')}
              className="flex-1 min-w-0 rounded-lg border border-[var(--clr-border)] px-3 py-2 text-sm"
              disabled={coupon.status === 'applying'}
            />
            <button
              type="submit"
              disabled={!couponInput.trim() || coupon.status === 'applying'}
              className="btn btn-outline px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {coupon.status === 'applying' ? t('cart.applying', 'Checking…') : t('cart.apply', 'Apply')}
            </button>
          </form>
        )}
        {coupon.status === 'error' && coupon.error && (
          <p className="text-xs text-red-600 mt-1.5">{coupon.error}</p>
        )}
      </div>

      <div className="flex justify-between text-base font-bold text-gray-900 mb-5">
        <span>Total</span>
        <span className="text-primary text-xl">₹{total.toFixed(2)}</span>
      </div>

      {hasUnavailableItem && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 mb-3">
          <FiAlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {t(
            'cart.resolveBeforeCheckout',
            'Remove or update the out-of-stock items in your cart to continue.'
          )}
        </p>
      )}

      <button
        onClick={() => requireAuth(() => navigate('/checkout'))}
        disabled={hasUnavailableItem}
        className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Proceed to checkout"
      >
        Proceed to Checkout
        <FiArrowRight className="w-4 h-4" aria-hidden />
      </button>
    </aside>
  );
}

CartSummary.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
    })
  ).isRequired,
};
