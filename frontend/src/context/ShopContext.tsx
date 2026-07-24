import React, { createContext, useContext, useState, useEffect } from "react";

interface ShopContextType {
  isShopOpen: boolean;
  toggleShopOpen: () => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isShopOpen, setIsShopOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("saibaba_shop_status");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("saibaba_shop_status", JSON.stringify(isShopOpen));
  }, [isShopOpen]);

  const toggleShopOpen = () => {
    setIsShopOpen((prev) => !prev);
  };

  return (
    <ShopContext.Provider value={{ isShopOpen, toggleShopOpen }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};
