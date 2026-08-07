// src/components/Product/QuantitySelector.jsx
import React from 'react';

export default function QuantitySelector({ quantity, setQuantity }) {
  const decrease = () => setQuantity(q => Math.max(1, q - 1));
  const increase = () => setQuantity(q => q + 1);

  return (
    <div className="inline-flex items-center rounded-lg border-2 border-gray-200 overflow-hidden" role="group" aria-label="Quantity">
      <button
        type="button"
        onClick={decrease}
        aria-label="Decrease quantity"
        disabled={quantity <= 1}
        className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-primary hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        −
      </button>
      <input
        type="number"
        value={quantity}
        min={1}
        onChange={e => setQuantity(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
        className="w-14 text-center bg-transparent text-base font-semibold text-gray-900 outline-none"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={increase}
        aria-label="Increase quantity"
        className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-primary hover:text-black transition-colors"
      >
        +
      </button>
    </div>
  );
}
