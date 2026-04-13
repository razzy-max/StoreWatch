export function SkeletonLoader({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700/70 ${className}`} />;
}
