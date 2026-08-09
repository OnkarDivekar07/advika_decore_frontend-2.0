// features/cart/utils/cartUtils.js
import { handleError } from '@/utils/errorHandler';



export const getCartFromLocalStorage = () => {
  try {
    const cart = JSON.parse(localStorage.getItem('cart'));
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
};

export const updateCartToLocalStorage = (cart) => {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const clearCartFromLocalStorage = () => {
  try {
    localStorage.removeItem('cart');
  } catch (error) {
    handleError(error);
  }
};

const BUY_NOW_KEY = 'buyNow';

export const getBuyNowItem = () => {
  try {
    const item = JSON.parse(localStorage.getItem(BUY_NOW_KEY));
    return item && typeof item === 'object' ? item : null;
  } catch {
    return null;
  }
};

export const setBuyNowItem = (product, quantity = 1) => {
  try {
    localStorage.setItem(
      BUY_NOW_KEY,
      JSON.stringify({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.images?.[0] || '',
      })
    );
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const clearBuyNowItem = () => {
  try {
    localStorage.removeItem(BUY_NOW_KEY);
  } catch (error) {
    handleError(error);
  }
};

export const addToCart = (product, quantity = 1) => {
  try {
    localStorage.removeItem('orderId');

    const cart = getCartFromLocalStorage();

    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.images?.[0] || '',
      });
    }

    updateCartToLocalStorage(cart);
    localStorage.removeItem("buyNow");
    localStorage.removeItem("orderMode");

    // ✅ Replace alert with toast (or call a toast from UI)
    // Example:
    // showToast("Added to cart!");
    return { success: true };
  } catch (error) {
    handleError(error)
    return { success: false, error };
  }
};

export const buyNow = (product, quantity = 1) => {
  try {
    localStorage.removeItem('orderId');
    localStorage.setItem('buyNow', JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0] || '',
    }));
    localStorage.setItem('orderMode', 'buyNow');
    return { success: true };
  } catch (error) {
    handleError(error)
    return { success: false, error };
  }
};
