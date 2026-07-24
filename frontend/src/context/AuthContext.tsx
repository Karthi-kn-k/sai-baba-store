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

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const newUser = { ...prev, ...updatedUser };
      // Save avatar per user ID to localStorage so changes persist across sessions
      if (updatedUser.avatarUrl !== undefined) {
        if (updatedUser.avatarUrl) {
          localStorage.setItem(`user_avatar_${prev.id}`, updatedUser.avatarUrl);
        } else {
          localStorage.removeItem(`user_avatar_${prev.id}`);
        }
      }
      return newUser;
    });
  };

  const fetchProfile = async () => {
    try {
      if (getAccessToken()) {
        const data = await authApi.getMe();
        const savedAvatar = localStorage.getItem(`user_avatar_${data.user.id}`);
        setUser({ ...data.user, avatarUrl: savedAvatar || data.user.avatarUrl || null });
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
      const savedAvatar = localStorage.getItem(`user_avatar_${data.user.id}`);
      setUser({ ...data.user, avatarUrl: savedAvatar || data.user.avatarUrl || null });
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
      const savedAvatar = localStorage.getItem(`user_avatar_${data.user.id}`);
      setUser({ ...data.user, avatarUrl: savedAvatar || data.user.avatarUrl || null });
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithTokens = (payload: { accessToken: string; refreshToken: string; user: User }) => {
    setTokens(payload.accessToken, payload.refreshToken);
    const savedAvatar = localStorage.getItem(`user_avatar_${payload.user.id}`);
    setUser({ ...payload.user, avatarUrl: savedAvatar || payload.user.avatarUrl || null });
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
