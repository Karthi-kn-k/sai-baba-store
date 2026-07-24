import React, { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { CustomerDashboard } from "./pages/CustomerDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

const AppContent: React.FC = () => {
  const { user, isInitializing } = useAuth();
  const { setThemeForRole } = useTheme();

  // Scoped theme loading hook
  useEffect(() => {
    if (user) {
      const savedTheme = (localStorage.getItem(`theme_${user.role}`) as any) || "light";
      setThemeForRole(user.role, savedTheme);
    } else {
      const savedTheme = (localStorage.getItem(`theme_GUEST`) as any) || "light";
      setThemeForRole("GUEST", savedTheme);
    }
  }, [user, setThemeForRole]);

  // Full-screen loading spinner
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Restoring your session...</p>
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return <Login />;
  }

  // Dashboard routing
  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Navbar onCartToggle={() => {
        // Dispatch toggle cart drawer event if on customer dashboard
        window.dispatchEvent(new Event("toggle-cart-drawer"));
      }} />
      
      {user.role === "ADMIN" ? (
        <AdminDashboard />
      ) : (
        <CustomerDashboard />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
