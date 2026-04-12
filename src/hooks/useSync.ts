import { useEffect, useState } from 'react';
import { refreshPackagingFromSupabase, refreshProductsFromSupabase, syncPendingRecords } from '@/lib/sync';

export function useSync() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setOffline(false);
      setSyncing(true);
      try {
        await syncPendingRecords();
        await refreshProductsFromSupabase();
        await refreshPackagingFromSupabase();
      } finally {
        setSyncing(false);
      }
    };

    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      handleOnline().catch(() => undefined);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { offline, syncing };
}
