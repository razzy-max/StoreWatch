import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';
import clsx from 'clsx';
import { Button } from './Button';

export type ToastTone = 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  const toneClasses = {
    success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100',
    error: 'border-red-500/40 bg-red-500/15 text-red-900 dark:text-red-100',
    warning: 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100'
  }[toast.tone];

  const icon = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
    error: <AlertTriangle className="h-5 w-5 text-red-300" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-300" />
  }[toast.tone];

  return (
    <div className="fixed left-1/2 top-4 z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 animate-slide-in-down rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-soft backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className={clsx('flex items-start gap-3 rounded-xl border p-3', toneClasses)}>
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="text-sm text-inherit/90">{toast.message}</p>
        </div>
        <Button variant="ghost" className="min-h-0 p-1 text-inherit" onClick={onDismiss} aria-label="Dismiss toast">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
