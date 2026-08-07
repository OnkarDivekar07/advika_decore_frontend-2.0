// src/pages/Cart/CartPage.jsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FiShoppingBag } from 'react-icons/fi';
import Navbar from '@/components/Navbar/Navbar';
import CartItem from '@/components/Cart/CartItem';
import CartSummary from '@/components/Cart/CartSummary';
import { getCartFromLocalStorage, updateCartToLocalStorage } from '@/features/cart/cartUtils';

export default function CartPage() {
  const { t } = useTranslation();
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    setCartItems(getCartFromLocalStorage());
  }, []);

  const handleQuantityChange = (id, quantity) => {
    const updated = cartItems.map(item => item.id === id ? { ...item, quantity } : item);
    setCartItems(updated);
    updateCartToLocalStorage(updated);
  };

  const handleRemove = (id) => {
    const updated = cartItems.filter(item => item.id !== id);
    setCartItems(updated);
    updateCartToLocalStorage(updated);
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="section-title mb-8">{t('cart.title', 'Your Cart')}</h1>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <FiShoppingBag className="w-14 h-14 text-gray-300" aria-hidden />
            <p className="text-gray-500 text-lg">{t('cart.empty', 'Your cart is empty.')}</p>
            <Link to="/" className="btn btn-primary px-6">
              {t('cart.continueShopping', 'Continue Shopping')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Items */}
            <section
              className="flex-1 flex flex-col gap-4"
              aria-label={t('cart.itemsSection', 'Cart items')}
            >
              {cartItems.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemove}
                />
              ))}
            </section>

            {/* Summary */}
            <CartSummary items={cartItems} />
          </div>
        )}
      </main>
    </>
  );
}
