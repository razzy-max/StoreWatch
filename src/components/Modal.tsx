import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 pb-3 pt-12 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slatePanel sm:max-w-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>
          <Button variant="ghost" className="min-h-10 min-w-10 p-2" onClick={onClose} aria-label="Close modal">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(92vh-9rem)] overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">{footer}</div> : null}
      </div>
    </div>
  );
}
