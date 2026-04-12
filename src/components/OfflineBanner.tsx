import { WifiOff } from 'lucide-react';

export function OfflineBanner({ offline }: { offline: boolean }) {
  if (!offline) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-soft">
      <WifiOff className="h-4 w-4" />
      Offline Mode
    </div>
  );
}
