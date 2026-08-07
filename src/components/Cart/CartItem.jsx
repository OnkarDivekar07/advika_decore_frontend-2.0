// src/components/Cart/CartItem.jsx
import React from 'react';
import { FiTrash2 } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

export default function CartItem({ item, onQuantityChange, onRemove }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const itemName = typeof item.name === 'object'
    ? item.name[lang] ?? item.name.en ?? 'Item'
    : item.name ?? 'Item';

  const decrement = () => item.quantity > 1 && onQuantityChange(item.id, item.quantity - 1);
  const increment = () => onQuantityChange(item.id, item.quantity + 1);
  const lineTotal = (item.price * item.quantity).toFixed(2);

  return (
    <div className="card flex flex-col sm:flex-row items-start gap-4 p-4">
      {/* Image */}
      <div className="w-full sm:w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-[var(--clr-border)]">
        <img
          src={item.image || '/placeholder.jpg'}
          alt={itemName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <h3 className="text-base font-semibold text-gray-800 truncate">{itemName}</h3>
        <p className="text-sm text-gray-500">₹{item.price.toFixed(2)} / unit</p>

        {/* Quantity controls */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs font-medium text-gray-500 mr-1">{t('cart.qty', 'Qty')}:</span>
          <button
            onClick={decrement}
            disabled={item.quantity <= 1}
            aria-label={t('cart.decrease', 'Decrease')}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-base font-bold flex items-center justify-center transition-colors"
          >−</button>
          <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
          <button
            onClick={increment}
            aria-label={t('cart.increase', 'Increase')}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-primary text-base font-bold flex items-center justify-center transition-colors"
          >+</button>
        </div>
      </div>

      {/* Price & remove */}
      <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 self-start sm:self-center">
        <p className="text-lg font-bold text-primary whitespace-nowrap">₹{lineTotal}</p>
        <button
          onClick={() => onRemove(item.id)}
          aria-label={t('cart.removeItem', { item: itemName, defaultValue: `Remove ${itemName}` })}
          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

CartItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.any.isRequired,
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    price: PropTypes.number.isRequired,
    quantity: PropTypes.number.isRequired,
    image: PropTypes.string,
  }).isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
