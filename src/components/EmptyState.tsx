import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
}

export function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slatePanel">
      <Icon className="h-10 w-10 text-slate-500 dark:text-slate-500" />
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
