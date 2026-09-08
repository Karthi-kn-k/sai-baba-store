import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id: string; // matches product.id
  name: string;
  price: number;
  quantity: number;
  stockQty: number;
  imageUrl?: string | null;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const storageKey = user?.id ? `cart_user_${user.id}` : "cart_guest";

  const [cart, setCart] = useState<CartItem[]>(() => {
    const localData = localStorage.getItem(storageKey);
    return localData ? JSON.parse(localData) : [];
  });

  // Whenever logged-in user changes (e.g. login, logout, account switch), restore that user's cart
  useEffect(() => {
    const localData = localStorage.getItem(storageKey);
    setCart(localData ? JSON.parse(localData) : []);
  }, [user?.id, storageKey]);

  // Persist cart changes under user-specific storage key
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey]);

  const addToCart = (product: any, qty: number = 1) => {
    const safeQty = Math.max(1, Math.min(qty, product.stockQty));
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + safeQty, product.stockQty);
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: safeQty,
          stockQty: product.stockQty,
          imageUrl: product.imageUrl
        }
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: Math.min(quantity, item.stockQty) } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(storageKey);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
};

