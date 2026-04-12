import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toast, type ToastMessage, type ToastTone } from './Toast';

interface ToastContextValue {
  pushToast: (tone: ToastTone, title: string, message: string) => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast: (tone, title, message) => {
        setToast({ id: crypto.randomUUID(), tone, title, message });
      },
      success: (title, message) => {
        setToast({ id: crypto.randomUUID(), tone: 'success', title, message });
      },
      error: (title, message) => {
        setToast({ id: crypto.randomUUID(), tone: 'error', title, message });
      },
      warning: (title, message) => {
        setToast({ id: crypto.randomUUID(), tone: 'warning', title, message });
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
