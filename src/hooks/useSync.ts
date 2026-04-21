import { useEffect, useState } from 'react';
import { db } from '@/lib/dexie';
import { refreshPackagingFromSupabase, refreshProductsFromSupabase, syncPendingRecords } from '@/lib/sync';

export function useSync() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    const refreshPendingCount = async () => {
      const [pendingSales, pendingStock] = await Promise.all([
        db.sales.filter((sale) => !sale.synced).count(),
        db.stock_updates.filter((stockUpdate) => !stockUpdate.synced).count()
      ]);

      setPendingCount(pendingSales + pendingStock);
    };

    const handleOnline = async () => {
      setOffline(false);
      setSyncing(true);
      try {
        await syncPendingRecords();
        await refreshProductsFromSupabase();
        await refreshPackagingFromSupabase();
        setLastSyncedAt(new Date().toISOString());
        await refreshPendingCount();
      } finally {
        setSyncing(false);
      }
    };

    const handleOffline = () => {
      setOffline(true);
      refreshPendingCount().catch(() => undefined);
    };

    const handleChange = () => {
      refreshPendingCount().catch(() => undefined);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storewatch:change', handleChange as EventListener);

    refreshPendingCount().catch(() => undefined);

    if (navigator.onLine) {
      handleOnline().catch(() => undefined);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storewatch:change', handleChange as EventListener);
    };
  }, []);

  return { offline, syncing, pendingCount, lastSyncedAt };
}
