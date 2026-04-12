import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', fullWidth, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'min-h-12 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth && 'w-full',
        variant === 'primary' && 'bg-amberAccent text-slate-950 shadow-soft hover:bg-amber-400',
        variant === 'secondary' && 'bg-slate-700 text-slate-50 hover:bg-slate-600',
        variant === 'ghost' && 'bg-transparent text-slate-100 hover:bg-slate-800',
        variant === 'danger' && 'bg-danger text-white hover:bg-red-500',
        variant === 'success' && 'bg-success text-white hover:bg-emerald-500',
        className
      )}
      {...props}
    />
  );
});
