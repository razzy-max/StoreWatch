import { useEffect, useState } from 'react';
import { db } from '@/lib/dexie';
import { getCachedProducts, refreshProductsFromSupabase } from '@/lib/sync';
import type { ProductRecord } from '@/types/models';

export function useProducts() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const cached = await getCachedProducts();
      if (mounted) {
        setProducts(cached);
        setLoading(false);
      }
    }

    load();

    const handleChange = async () => {
      const cached = await getCachedProducts();
      setProducts(cached);
    };

    const handleOnline = async () => {
      try {
        await refreshProductsFromSupabase();
      } finally {
        const cached = await getCachedProducts();
        setProducts(cached);
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

  return { products, loading, setProducts };
}

export async function primeProductsCache() {
  await refreshProductsFromSupabase();
  return db.products.toArray();
}
