import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Render Area */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start justify-between p-4 rounded-xl shadow-lg border transition-all duration-300 animate-slide-in ${
              t.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : t.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-200"
                : t.type === "warning"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
              {t.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />}
              {t.type === "info" && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
              <span className="text-sm font-medium">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
};
