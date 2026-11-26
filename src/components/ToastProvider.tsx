"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        dismiss(id);
      }, 5500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-md flex-col gap-2.5 px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => {
          const styles =
            toast.variant === "success"
              ? "border-[#22AA22]/30 bg-white text-[#111111] ring-1 ring-[#22AA22]/20"
              : toast.variant === "error"
                ? "border-[#CC0000]/40 bg-[#FFF5F5] text-[#111111] ring-1 ring-[#CC0000]/20"
                : toast.variant === "warning"
                  ? "border-[#FFB800]/50 bg-[#FFFBEB] text-[#111111] ring-1 ring-[#FFB800]/30"
                  : "border-[#0055CC]/30 bg-white text-[#111111] ring-1 ring-[#0055CC]/20";

          const icon =
            toast.variant === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22AA22]" />
            ) : toast.variant === "error" ? (
              <AlertCircle className="h-5 w-5 shrink-0 text-[#CC0000]" />
            ) : toast.variant === "warning" ? (
              <AlertCircle className="h-5 w-5 shrink-0 text-[#FFB800]" />
            ) : (
              <Info className="h-5 w-5 shrink-0 text-[#0055CC]" />
            );

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg transition-all ${styles}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#111111]">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-[#333333]">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-[#666666] hover:bg-black/5 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
