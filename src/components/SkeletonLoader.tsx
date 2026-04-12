export function SkeletonLoader({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-700/70 ${className}`} />;
}
