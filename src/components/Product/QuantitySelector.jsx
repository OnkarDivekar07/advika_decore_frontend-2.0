// src/components/Product/QuantitySelector.jsx
import React from 'react';

export default function QuantitySelector({ quantity, setQuantity, max, disabled = false }) {
  const hasMax = typeof max === 'number' && Number.isFinite(max) && max > 0;

  const clamp = (value) => {
    let next = Math.max(1, Math.floor(value) || 1);
    if (hasMax) next = Math.min(next, max);
    return next;
  };

  const decrease = () => setQuantity((q) => clamp(q - 1));
  const increase = () => setQuantity((q) => clamp(q + 1));
  const handleChange = (e) => setQuantity(clamp(Number(e.target.value)));
  const handleBlur = () => setQuantity((q) => clamp(q));

  const atMax = hasMax && quantity >= max;

  return (
    <div
      className={`inline-flex items-center rounded-lg border-2 border-gray-200 overflow-hidden ${
        disabled ? 'opacity-50' : ''
      }`}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        onClick={decrease}
        aria-label="Decrease quantity"
        disabled={disabled || quantity <= 1}
        className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-primary hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        −
      </button>
      <input
        type="number"
        value={quantity}
        min={1}
        max={hasMax ? max : undefined}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-14 text-center bg-transparent text-base font-semibold text-gray-900 outline-none disabled:cursor-not-allowed"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={increase}
        aria-label="Increase quantity"
        disabled={disabled || atMax}
        className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-primary hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        +
      </button>
    </div>
  );
}
