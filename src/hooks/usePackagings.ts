import { useEffect, useState } from 'react';
import { db } from '@/lib/dexie';
import { getCachedPackaging, refreshPackagingFromSupabase } from '@/lib/sync';
import type { ProductPackagingRecord } from '@/types/models';

export function usePackagings() {
  const [packagings, setPackagings] = useState<ProductPackagingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const cached = await getCachedPackaging();
      if (mounted) {
        setPackagings(cached);
        setLoading(false);
      }

      if (navigator.onLine) {
        try {
          await refreshPackagingFromSupabase();
        } finally {
          const latest = await getCachedPackaging();
          if (mounted) {
            setPackagings(latest);
          }
        }
      }
    }

    load();

    const handleChange = async () => {
      const cached = await getCachedPackaging();
      setPackagings(cached);
    };

    const handleOnline = async () => {
      try {
        await refreshPackagingFromSupabase();
      } finally {
        const cached = await getCachedPackaging();
        setPackagings(cached);
      }
    };

    window.addEventListener('storewatch:change', handleChange as EventListener);
    window.addEventListener('online', handleOnline);

    return () => {
      mounted = false;
      window.removeEventListener('storewatch:change', handleChange as EventListener);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { packagings, loading };
}

export async function primePackagingCache() {
  await refreshPackagingFromSupabase();
  return db.product_packaging.toArray();
}
