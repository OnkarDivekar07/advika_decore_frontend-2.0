// src/components/Cart/CartSummary.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FiArrowRight } from 'react-icons/fi';
import { useAuthGate } from '@/contexts/AuthGateContext';

export default function CartSummary({ items }) {
  const navigate = useNavigate();
  const { requireAuth } = useAuthGate();
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <aside
      className="card p-5 sm:p-6 sticky top-24 self-start w-full max-w-sm"
      aria-label="Order summary"
    >
      <h2 className="font-display text-xl font-bold text-gray-900 mb-5">Order Summary</h2>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Items ({itemCount})</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span className="text-green-600 font-medium">Free</span>
        </div>
      </div>

      <hr className="my-4 border-[var(--clr-border)]" />

      <div className="flex justify-between text-base font-bold text-gray-900 mb-5">
        <span>Total</span>
        <span className="text-primary text-xl">₹{subtotal.toFixed(2)}</span>
      </div>

      <button
        onClick={() => requireAuth(() => navigate('/checkout'))}
        className="btn btn-primary w-full py-3 text-base"
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
