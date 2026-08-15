// src/components/Cart/CartItem.jsx
import React from 'react';
import { FiTrash2 } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import ImageWithFallback from '@/components/Shared/ImageWithFallback';
import { getStockInfo } from '@/utils/productUtils';

function CartItem({ item, onQuantityChange, onRemove }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const itemName = typeof item.name === 'object'
    ? item.name[lang] ?? item.name.en ?? 'Item'
    : item.name ?? 'Item';

  // Shared with ProductDetails so "what counts as in/low/out of stock"
  // can't quietly drift between the product page and the cart. Passed a
  // narrowed { stock } object rather than the raw cart line item —
  // getStockInfo's field-sniffing also checks a `quantity` key, which on
  // a cart item means "how many are in the cart", not "how many are in
  // stock"; passing the whole item would let that collide and (once
  // stock is unknown) silently cap the stepper at whatever's already in
  // the cart.
  const stock = getStockInfo({ stock: item.stock });
  const hasKnownStock = stock.quantity !== null;
  const isOutOfStock = hasKnownStock && stock.quantity <= 0;
  const atStockLimit = hasKnownStock && item.quantity >= stock.quantity;

  const decrement = () => item.quantity > 1 && onQuantityChange(item.id, item.quantity - 1);
  const increment = () => !atStockLimit && onQuantityChange(item.id, item.quantity + 1);
  const lineTotal = (item.price * item.quantity).toFixed(2);

  return (
    <div
      className={`card flex flex-col sm:flex-row items-start gap-4 p-4 ${
        isOutOfStock ? 'border-red-200 bg-red-50/40' : ''
      }`}
    >
      {/* Image */}
      <div className="w-full sm:w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-[var(--clr-border)]">
        <ImageWithFallback
          src={item.image || null}
          alt={itemName}
          className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
          loading="lazy"
        />
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <h3 className="text-base font-semibold text-gray-800 truncate">{itemName}</h3>
        <p className="text-sm text-gray-500">₹{item.price.toFixed(2)} / unit</p>

        {/* Quantity controls — disabled outright once the item is out of
            stock; there's nothing a +/- tap can usefully do at that point,
            it can only be removed. */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs font-medium text-gray-500 mr-1">{t('cart.qty', 'Qty')}:</span>
          <button
            onClick={decrement}
            disabled={item.quantity <= 1 || isOutOfStock}
            aria-label={t('cart.decrease', 'Decrease')}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-base font-bold flex items-center justify-center transition-colors"
          >−</button>
          <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
          <button
            onClick={increment}
            disabled={atStockLimit}
            aria-label={t('cart.increase', 'Increase')}
            title={
              isOutOfStock
                ? t('cart.outOfStock', 'Out of stock')
                : atStockLimit
                  ? t('cart.stockLimitReached', 'Only {{count}} left in stock.', { count: stock.quantity })
                  : undefined
            }
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-base font-bold flex items-center justify-center transition-colors"
          >+</button>
        </div>

        {/* Stock hint — only shown once it's actually relevant, so it
            doesn't add noise for the common well-stocked case. Out of
            stock gets its own distinct message rather than "Only 0 left",
            plus a nudge to remove it since it can't be checked out. */}
        {isOutOfStock ? (
          <p className="text-xs font-semibold text-red-600">
            {t('cart.outOfStockRemove', 'Out of stock — remove this item to continue.')}
          </p>
        ) : atStockLimit ? (
          <p className="text-xs font-medium text-amber-600">
            {t('cart.stockLimitReached', 'Only {{count}} left in stock.', { count: stock.quantity })}
          </p>
        ) : stock.isLow ? (
          <p className="text-xs text-gray-500">
            {t('cart.lowStockHint', '{{count}} left in stock', { count: stock.quantity })}
          </p>
        ) : null}
      </div>

      {/* Price & remove */}
      <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 self-start sm:self-center">
        <p className="text-lg font-bold text-primary whitespace-nowrap">₹{lineTotal}</p>
        <button
          onClick={() => onRemove(item.id)}
          aria-label={t('cart.removeItem', { item: itemName, defaultValue: `Remove ${itemName}` })}
          className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
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
    stock: PropTypes.number,
  }).isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const MemoizedCartItem = React.memo(CartItem);
MemoizedCartItem.propTypes = CartItem.propTypes;

export default MemoizedCartItem;
