"use client";

import * as React from "react";
import { X } from "lucide-react";

type ToastProps = {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

const ToastContext = React.createContext<{
  toast: (props: ToastProps) => void;
}>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([]);

  const toast = React.useCallback(({ title, description, variant = "default" }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md border p-4 shadow-md ${
              t.variant === "destructive"
                ? "bg-red-50 border-red-200 text-red-700"
                : t.variant === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{t.title}</h3>
                {t.description && <p className="text-sm mt-1">{t.description}</p>}
              </div>
              <button 
                onClick={() => dismissToast(t.id)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
