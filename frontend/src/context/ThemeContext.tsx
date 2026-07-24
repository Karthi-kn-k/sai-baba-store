import React, { createContext, useContext } from "react";

export type Theme = "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (role?: string) => void;
  setThemeForRole: (role: string, theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always force light mode
  const theme = "light";

  const setThemeForRole = () => {
    // No-op to prevent compilation failures elsewhere
  };

  const toggleTheme = () => {
    // No-op
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeForRole }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
