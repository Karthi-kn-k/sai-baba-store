import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi, setTokens, clearTokens, getAccessToken } from "../api";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "CUSTOMER" | "ADMIN";
  hasAccountNotebook: boolean;
  notebookRequestStatus: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isInitializing: boolean;
  login: (credentials: any) => Promise<void>;
  signup: (userData: any) => Promise<void>;
  loginWithTokens: (payload: { accessToken: string; refreshToken: string; user: User }) => void;
  updateUser: (updatedUser: Partial<User>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const updateUser = async (updatedUser: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
    if (updatedUser.avatarUrl !== undefined) {
      try {
        const res = await authApi.updateProfile({ avatarUrl: updatedUser.avatarUrl });
        if (res.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.error("Failed to sync profile to cloud:", err);
      }
    }
  };

  const fetchProfile = async () => {
    try {
      if (getAccessToken()) {
        const data = await authApi.getMe();
        setUser(data.user);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      clearTokens();
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener("auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("auth-expired", handleAuthExpired);
    };
  }, []);

  const login = async (credentials: any) => {
    setLoading(true);
    try {
      const data = await authApi.login(credentials);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: any) => {
    setLoading(true);
    try {
      const data = await authApi.signup(userData);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithTokens = (payload: { accessToken: string; refreshToken: string; user: User }) => {
    setTokens(payload.accessToken, payload.refreshToken);
    setUser(payload.user);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout().catch(() => {});
    } finally {
      setUser(null);
      clearTokens();
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isInitializing, login, signup, loginWithTokens, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};
