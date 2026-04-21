import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dexie';
import type { SaleRecord, SaleView, StockUpdateRecord, StockUpdateView } from '@/types/models';
import type { ProductRecord } from '@/types/models';

async function loadEmployeeSales(employeeId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const cachedSales = await db.sales.where('recorded_by').equals(employeeId).toArray();
  return cachedSales.filter((sale: SaleRecord) => new Date(sale.timestamp) >= startOfDay);
}

async function loadEmployeeSalesFromInventoryMovements(employeeId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('inventory_movements')
    .select('id, product_id, packaging_id, entered_qty, unit_price_snapshot, recorded_by, timestamp, synced, delta_base_units, product:products(name), packaging:product_packaging(label)')
    .eq('recorded_by', employeeId)
    .eq('movement_type', 'sale')
    .gte('timestamp', startOfDay.toISOString())
    .order('timestamp', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => {
    const qty = Number((row as { entered_qty?: number }).entered_qty ?? 0);
    const unitPrice = Number((row as { unit_price_snapshot?: number }).unit_price_snapshot ?? 0);
    return {
      id: (row as { id: string }).id,
      product_id: (row as { product_id: string }).product_id,
      qty,
      total: qty * unitPrice,
      recorded_by: (row as { recorded_by: string }).recorded_by,
      timestamp: (row as { timestamp: string }).timestamp,
      synced: Boolean((row as { synced?: boolean }).synced),
      packaging_id: (row as { packaging_id?: string | null }).packaging_id ?? null,
      qty_base_units: Math.abs(Number((row as { delta_base_units?: number }).delta_base_units ?? 0)),
      unit_price_snapshot: unitPrice,
      product_name: Array.isArray((row as { product?: Array<{ name?: string }> }).product)
        ? (row as { product?: Array<{ name?: string }> }).product?.[0]?.name
        : (row as { product?: { name?: string } }).product?.name,
      packaging_label: Array.isArray((row as { packaging?: Array<{ label?: string }> }).packaging)
        ? (row as { packaging?: Array<{ label?: string }> }).packaging?.[0]?.label
        : (row as { packaging?: { label?: string } }).packaging?.label,
      employee_name: employeeId
    };
  }) as SaleRecord[];
}

export function useEmployeeLog(employeeId?: string) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      setSales([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      const cached = navigator.onLine ? await loadEmployeeSalesFromInventoryMovements(employeeId).catch(() => loadEmployeeSales(employeeId)) : await loadEmployeeSales(employeeId);
      if (mounted) {
        setSales(cached.sort((a: SaleRecord, b: SaleRecord) => b.timestamp.localeCompare(a.timestamp)));
        setLoading(false);
      }
    };

    load();

    const handleChange = async () => {
      const cached = navigator.onLine ? await loadEmployeeSalesFromInventoryMovements(employeeId).catch(() => loadEmployeeSales(employeeId)) : await loadEmployeeSales(employeeId);
      setSales(cached.sort((a: SaleRecord, b: SaleRecord) => b.timestamp.localeCompare(a.timestamp)));
    };

    window.addEventListener('storewatch:change', handleChange as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('storewatch:change', handleChange as EventListener);
    };
  }, [employeeId]);

  return { sales, loading };
}

export function useEmployeeStockLog(employeeId?: string) {
  const [updates, setUpdates] = useState<StockUpdateView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      setUpdates([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadFromInventoryMovements = async (): Promise<StockUpdateView[]> => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('inventory_movements')
        .select('id, product_id, packaging_id, entered_qty, recorded_by, timestamp, synced, delta_base_units, product:products(name), packaging:product_packaging(label, units_per_package), employee:users(name,role)')
        .eq('recorded_by', employeeId)
        .eq('movement_type', 'stock_receive')
        .gte('timestamp', startOfDay.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row: any) => ({
        id: (row as { id: string }).id,
        product_id: (row as { product_id: string }).product_id,
        qty_added: Number((row as { entered_qty?: number }).entered_qty ?? 0),
        recorded_by: (row as { recorded_by: string }).recorded_by,
        timestamp: (row as { timestamp: string }).timestamp,
        synced: Boolean((row as { synced?: boolean }).synced),
        packaging_id: (row as { packaging_id?: string | null }).packaging_id ?? null,
        qty_base_units: Math.abs(Number((row as { delta_base_units?: number }).delta_base_units ?? 0)),
        cost_price_per_unit: null,
        cost_price_per_package: null,
        product_name: Array.isArray((row as { product?: Array<{ name?: string }> }).product)
          ? (row as { product?: Array<{ name?: string }> }).product?.[0]?.name
          : (row as { product?: { name?: string } }).product?.name,
        employee_name: employeeId,
        recorded_by_name: Array.isArray((row as { employee?: Array<{ name?: string }> }).employee)
          ? (row as { employee?: Array<{ name?: string }> }).employee?.[0]?.name
          : (row as { employee?: { name?: string } }).employee?.name,
        recorded_by_role: Array.isArray((row as { employee?: Array<{ role?: 'owner' | 'employee' }> }).employee)
          ? (row as { employee?: Array<{ role?: 'owner' | 'employee' }> }).employee?.[0]?.role
          : (row as { employee?: { role?: 'owner' | 'employee' } }).employee?.role,
        packaging_label: Array.isArray((row as { packaging?: Array<{ label?: string }> }).packaging)
          ? (row as { packaging?: Array<{ label?: string }> }).packaging?.[0]?.label
          : (row as { packaging?: { label?: string } }).packaging?.label,
        packaging_units_per_package: Array.isArray((row as { packaging?: Array<{ units_per_package?: number }> }).packaging)
          ? (row as { packaging?: Array<{ units_per_package?: number }> }).packaging?.[0]?.units_per_package
          : (row as { packaging?: { units_per_package?: number } }).packaging?.units_per_package
      }));
    };

    const loadFromCache = async (): Promise<StockUpdateView[]> => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [cached, products, packaging] = await Promise.all([
        db.stock_updates.where('recorded_by').equals(employeeId).toArray(),
        db.products.toArray(),
        db.product_packaging.toArray()
      ]);

      const rows = cached
        .filter((item) => new Date(item.timestamp) >= startOfDay)
        .map((item) => ({
          ...item,
          product_name: products.find((product) => product.id === item.product_id)?.name,
          employee_name: employeeId,
          packaging_label: packaging.find((pkg) => pkg.id === item.packaging_id)?.label
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return rows;
    };

    const load = async () => {
      const rows = navigator.onLine ? await loadFromInventoryMovements().catch(loadFromCache) : await loadFromCache();
      if (mounted) {
        setUpdates(rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
        setLoading(false);
      }
    };

    load();

    const handleChange = () => {
      load();
    };

    window.addEventListener('storewatch:change', handleChange as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('storewatch:change', handleChange as EventListener);
    };
  }, [employeeId]);

  return { updates, loading };
}

export function useOwnerRecentSales() {
  const [sales, setSales] = useState<SaleView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!navigator.onLine) {
        const cached = await db.sales.orderBy('timestamp').reverse().limit(10).toArray();
        const products = await db.products.toArray();
        const list = cached.map((sale) => ({
          ...sale,
          product_name: products.find((product) => product.id === sale.product_id)?.name,
          employee_name: sale.recorded_by
        }));
        if (mounted) {
          setSales(list);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('sales')
        .select('*, product:products(name), employee:users(name), packaging:product_packaging(label)')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        const cached = await db.sales.orderBy('timestamp').reverse().limit(10).toArray();
        const products = await db.products.toArray();
        const list = cached.map((sale) => ({
          ...sale,
          product_name: products.find((product) => product.id === sale.product_id)?.name,
          employee_name: sale.recorded_by
        }));
        if (mounted) {
          setSales(list);
          setLoading(false);
        }
        return;
      }

      const rows = (data ?? []).map((row: any) => ({
        ...(row as SaleView),
        product_name: Array.isArray((row as { product?: Array<{ name?: string }> }).product)
          ? (row as { product?: Array<{ name?: string }> }).product?.[0]?.name
          : (row as { product?: { name?: string } }).product?.name,
        employee_name: Array.isArray((row as { employee?: Array<{ name?: string }> }).employee)
          ? (row as { employee?: Array<{ name?: string }> }).employee?.[0]?.name
          : (row as { employee?: { name?: string } }).employee?.name,
        packaging_label: Array.isArray((row as { packaging?: Array<{ label?: string }> }).packaging)
          ? (row as { packaging?: Array<{ label?: string }> }).packaging?.[0]?.label
          : (row as { packaging?: { label?: string } }).packaging?.label
      }));

      if (mounted) {
        setSales(rows);
        setLoading(false);
      }
    };

    load();

    const handleChange = () => {
      load();
    };

    window.addEventListener('storewatch:change', handleChange as EventListener);
    window.addEventListener('online', handleChange);

    const channel = supabase
      .channel('storewatch-sales-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, handleChange)
      .subscribe();

    return () => {
      mounted = false;
      window.removeEventListener('storewatch:change', handleChange as EventListener);
      window.removeEventListener('online', handleChange);
      supabase.removeChannel(channel);
    };
  }, []);

  return { sales, loading };
}

export function useSalesHistory(startDate: string, endDate: string) {
  const [sales, setSales] = useState<SaleView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const from = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      const to = new Date(`${endDate}T23:59:59.999Z`).toISOString();

      const { data } = await supabase
        .from('sales')
        .select('*, product:products(name), employee:users(name), packaging:product_packaging(label)')
        .gte('timestamp', from)
        .lte('timestamp', to)
        .order('timestamp', { ascending: false });

      const rows = (data ?? []).map((row: any) => ({
        ...(row as SaleView),
        product_name: Array.isArray((row as { product?: Array<{ name?: string }> }).product)
          ? (row as { product?: Array<{ name?: string }> }).product?.[0]?.name
          : (row as { product?: { name?: string } }).product?.name,
        employee_name: Array.isArray((row as { employee?: Array<{ name?: string }> }).employee)
          ? (row as { employee?: Array<{ name?: string }> }).employee?.[0]?.name
          : (row as { employee?: { name?: string } }).employee?.name,
        packaging_label: Array.isArray((row as { packaging?: Array<{ label?: string }> }).packaging)
          ? (row as { packaging?: Array<{ label?: string }> }).packaging?.[0]?.label
          : (row as { packaging?: { label?: string } }).packaging?.label
      }));

      if (mounted) {
        setSales(rows);
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [startDate, endDate]);

  return { sales, loading };
}

export function useStockUpdates() {
  const [updates, setUpdates] = useState<StockUpdateView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadFromCache() {
      const [cached, products, users, packaging] = await Promise.all([
        db.stock_updates.orderBy('timestamp').reverse().toArray(),
        db.products.toArray(),
        db.table('users').toArray().catch(() => []),
        db.product_packaging.toArray()
      ]);

      return cached.map((item: StockUpdateRecord) => ({
        ...item,
        product_name: products.find((product: ProductRecord) => product.id === item.product_id)?.name,
        employee_name: (users as Array<{ id: string; name?: string }>).find((user) => user.id === item.recorded_by)?.name,
        recorded_by_name: (users as Array<{ id: string; name?: string }>).find((user) => user.id === item.recorded_by)?.name,
        packaging_label: packaging.find((pkg) => pkg.id === item.packaging_id)?.label,
        packaging_units_per_package: packaging.find((pkg) => pkg.id === item.packaging_id)?.units_per_package
      }));
    }

    async function load() {
      if (!navigator.onLine) {
        const rows = await loadFromCache();
        if (mounted) {
          setUpdates(rows);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('stock_updates')
        .select('*, product:products(name), employee:users(name,role), packaging:product_packaging(label, units_per_package)')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (error) {
        const rows = await loadFromCache();
        if (mounted) {
          setUpdates(rows);
          setLoading(false);
        }
        return;
      }

      const rows = (data ?? []).map((row: any) => ({
        ...(row as StockUpdateView),
        product_name: Array.isArray((row as { product?: Array<{ name?: string }> }).product)
          ? (row as { product?: Array<{ name?: string }> }).product?.[0]?.name
          : (row as { product?: { name?: string } }).product?.name,
        employee_name: Array.isArray((row as { employee?: Array<{ name?: string }> }).employee)
          ? (row as { employee?: Array<{ name?: string }> }).employee?.[0]?.name
          : (row as { employee?: { name?: string } }).employee?.name,
        recorded_by_name: Array.isArray((row as { employee?: Array<{ name?: string }> }).employee)
          ? (row as { employee?: Array<{ name?: string }> }).employee?.[0]?.name
          : (row as { employee?: { name?: string } }).employee?.name,
        recorded_by_role: Array.isArray((row as { employee?: Array<{ role?: 'owner' | 'employee' }> }).employee)
          ? (row as { employee?: Array<{ role?: 'owner' | 'employee' }> }).employee?.[0]?.role
          : (row as { employee?: { role?: 'owner' | 'employee' } }).employee?.role,
        packaging_label: Array.isArray((row as { packaging?: Array<{ label?: string }> }).packaging)
          ? (row as { packaging?: Array<{ label?: string }> }).packaging?.[0]?.label
          : (row as { packaging?: { label?: string } }).packaging?.label,
        packaging_units_per_package: Array.isArray((row as { packaging?: Array<{ units_per_package?: number }> }).packaging)
          ? (row as { packaging?: Array<{ units_per_package?: number }> }).packaging?.[0]?.units_per_package
          : (row as { packaging?: { units_per_package?: number } }).packaging?.units_per_package
      }));

      if (mounted) {
        setUpdates(rows);
        setLoading(false);
      }
    }

    load();
    const handleChange = load;
    window.addEventListener('storewatch:change', handleChange as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('storewatch:change', handleChange as EventListener);
    };
  }, []);

  return { updates, loading };
}
