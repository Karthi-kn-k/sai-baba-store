import React, { createContext, useContext, useState, useEffect } from "react";

interface ShopContextType {
  isShopOpen: boolean;
  toggleShopOpen: () => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isShopOpen, setIsShopOpen] = useState<boolean>(true);

  // Poll global shop open status from backend DB
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) {
        const data = await res.json();
        if (typeof data.isShopOpen === "boolean") {
          setIsShopOpen(data.isShopOpen);
        }
      }
    } catch (e) {
      // Ignore network fallback
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Sync every 5s
    return () => clearInterval(interval);
  }, []);

  const toggleShopOpen = async () => {
    const nextState = !isShopOpen;
    setIsShopOpen(nextState);

    const token = localStorage.getItem("accessToken");
    try {
      await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isShopOpen: nextState })
      });
    } catch (e) {
      console.error("Failed to sync shop status:", e);
    }
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
