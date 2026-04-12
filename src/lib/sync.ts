import { supabase } from './supabase';
import { db } from './dexie';
import type { ProductCategory, ProductPackagingRecord, ProductRecord, SaleRecord, StockUpdateRecord } from '@/types/models';
import { getEffectiveStockUnits } from '@/utils/stockDisplay';

export type SaveProductInput = {
  id?: string;
  name: string;
  category: ProductCategory;
  unit_price: number;
  stock_qty: number;
  low_stock_threshold: number;
};

export async function refreshPackagingFromSupabase() {
  if (!navigator.onLine) {
    return db.product_packaging.toArray();
  }

  const { data, error } = await supabase.from('product_packaging').select('*').order('product_id').order('label');
  if (error) {
    throw new Error(error.message);
  }

  const packagings = (data ?? []) as ProductPackagingRecord[];
  await db.product_packaging.bulkPut(packagings);
  emitChange('packaging');
  return packagings;
}

export async function getCachedPackaging() {
  return db.product_packaging.orderBy('label').toArray();
}

async function applyInventoryMovementOnline(input: {
  id: string;
  productId: string;
  packagingId: string;
  movementType: 'sale' | 'stock_receive' | 'adjustment' | 'return' | 'breakage';
  enteredQty: number;
  recordedBy: string;
  unitPriceSnapshot?: number | null;
  timestamp: string;
}) {
  const { error } = await supabase.rpc('apply_inventory_movement', {
    p_id: input.id,
    p_product_id: input.productId,
    p_packaging_id: input.packagingId,
    p_movement_type: input.movementType,
    p_entered_qty: input.enteredQty,
    p_recorded_by: input.recordedBy,
    p_unit_price_snapshot: input.unitPriceSnapshot ?? null,
    p_timestamp: input.timestamp,
    p_synced: true
  });

  if (error) {
    throw new Error(error.message);
  }
}

function emitChange(scope: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('storewatch:change', { detail: { scope } }));
}

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '');
    return message || fallback;
  }

  return fallback;
}

export async function refreshProductsFromSupabase() {
  if (!navigator.onLine) {
    return db.products.toArray();
  }

  const { data, error } = await supabase.from('products').select('*').order('category').order('name');
  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? []) as ProductRecord[];
  await db.products.bulkPut(products);
  emitChange('products');
  return products;
}

export async function getCachedProducts() {
  return db.products.orderBy('name').toArray();
}

export async function saveProduct(input: SaveProductInput) {
  const stockBaseUnits = input.stock_qty;
  const lowStockThresholdBaseUnits = input.low_stock_threshold;
  const payload = {
    id: input.id ?? crypto.randomUUID(),
    name: input.name.trim(),
    category: input.category,
    unit_price: input.unit_price,
    stock_qty: input.stock_qty,
    low_stock_threshold: input.low_stock_threshold,
    stock_base_units: stockBaseUnits,
    low_stock_threshold_base_units: lowStockThresholdBaseUnits,
    base_unit_name: 'Bottle',
    created_at: new Date().toISOString()
  } satisfies ProductRecord;

  if (navigator.onLine) {
    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (error) {
      throw new Error(error.message);
    }
  }

  await db.products.put(payload);
  emitChange('products');
  return payload;
}

export async function deleteProduct(productId: string) {
  if (navigator.onLine) {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      throw new Error(error.message);
    }
  }

  await db.products.delete(productId);
  emitChange('products');
}

export async function savePackaging(input: {
  product_id: string;
  label: string;
  units_per_package: number;
  selling_price_per_package: number;
}) {
  const packaging: ProductPackagingRecord = {
    id: crypto.randomUUID(),
    product_id: input.product_id,
    label: input.label,
    units_per_package: input.units_per_package,
    selling_price_per_package: input.selling_price_per_package,
    is_default: false,
    created_at: new Date().toISOString()
  };

  if (navigator.onLine) {
    const { error } = await supabase.from('product_packaging').insert(packaging);
    if (error) {
      throw new Error(error.message);
    }
  }

  await db.product_packaging.put(packaging);
  emitChange('packaging');
  return packaging;
}

export async function deletePackaging(packagingId: string) {
  if (navigator.onLine) {
    const { error } = await supabase.from('product_packaging').delete().eq('id', packagingId);
    if (error) {
      throw new Error(error.message);
    }
  }

  await db.product_packaging.delete(packagingId);
  emitChange('packaging');
}

export async function recordSale(input: {
  product: ProductRecord;
  packaging: ProductPackagingRecord;
  qty: number;
  recordedBy: string;
  synced?: boolean;
}) {
  const timestamp = new Date().toISOString();
  const total = input.qty * Number(input.packaging.selling_price_per_package);
  const qtyBaseUnits = input.qty * Number(input.packaging.units_per_package);
  const nextStock = getEffectiveStockUnits(input.product) - qtyBaseUnits;
  const sale: SaleRecord = {
    id: crypto.randomUUID(),
    product_id: input.product.id,
    qty: input.qty,
    total,
    recorded_by: input.recordedBy,
    timestamp,
    synced: Boolean(input.synced),
    packaging_id: input.packaging.id,
    qty_base_units: qtyBaseUnits,
    unit_price_snapshot: input.packaging.selling_price_per_package
  };

  if (navigator.onLine) {
    const { error: saleError } = await supabase.from('sales').insert({
      id: sale.id,
      product_id: sale.product_id,
      qty: sale.qty,
      total: sale.total,
      recorded_by: sale.recorded_by,
      timestamp: sale.timestamp,
      synced: true,
      packaging_id: sale.packaging_id,
      qty_base_units: sale.qty_base_units,
      unit_price_snapshot: sale.unit_price_snapshot
    });

    if (saleError) {
      throw new Error(saleError.message);
    }

    await applyInventoryMovementOnline({
      id: sale.id,
      productId: input.product.id,
      packagingId: input.packaging.id,
      movementType: 'sale',
      enteredQty: input.qty,
      recordedBy: input.recordedBy,
      unitPriceSnapshot: input.packaging.selling_price_per_package,
      timestamp
    });

    await db.products.update(input.product.id, { stock_qty: nextStock, stock_base_units: nextStock, low_stock_threshold_base_units: input.product.low_stock_threshold_base_units ?? input.product.low_stock_threshold });
    await db.sales.put({ ...sale, synced: true });
    emitChange('sales');
    emitChange('products');
    return sale;
  }

  await db.sales.put({ ...sale, synced: false });
  await db.products.update(input.product.id, { stock_qty: nextStock, stock_base_units: nextStock });
  emitChange('sales');
  emitChange('products');
  return sale;
}

export async function recordStockUpdate(input: {
  product: ProductRecord;
  packaging: ProductPackagingRecord;
  qtyAdded: number;
  recordedBy: string;
  synced?: boolean;
  costPricePerUnit?: number;
}) {
  const timestamp = new Date().toISOString();
  const qtyBaseUnits = input.qtyAdded * Number(input.packaging.units_per_package);
  const nextStock = getEffectiveStockUnits(input.product) + qtyBaseUnits;
  const stockUpdate: StockUpdateRecord = {
    id: crypto.randomUUID(),
    product_id: input.product.id,
    qty_added: input.qtyAdded,
    recorded_by: input.recordedBy,
    timestamp,
    synced: Boolean(input.synced),
    packaging_id: input.packaging.id,
    qty_base_units: qtyBaseUnits,
    cost_price_per_unit: input.costPricePerUnit || null
  };

  if (navigator.onLine) {
    const { error: stockError } = await supabase.from('stock_updates').insert({
      id: stockUpdate.id,
      product_id: stockUpdate.product_id,
      qty_added: stockUpdate.qty_added,
      recorded_by: stockUpdate.recorded_by,
      timestamp: stockUpdate.timestamp,
      synced: true,
      packaging_id: stockUpdate.packaging_id,
      qty_base_units: stockUpdate.qty_base_units,
      cost_price_per_unit: stockUpdate.cost_price_per_unit
    });

    if (stockError) {
      throw new Error(stockError.message);
    }

    await applyInventoryMovementOnline({
      id: stockUpdate.id,
      productId: input.product.id,
      packagingId: input.packaging.id,
      movementType: 'stock_receive',
      enteredQty: input.qtyAdded,
      recordedBy: input.recordedBy,
      timestamp,
      unitPriceSnapshot: null
    });

    await db.products.update(input.product.id, { stock_qty: nextStock, stock_base_units: nextStock, low_stock_threshold_base_units: input.product.low_stock_threshold_base_units ?? input.product.low_stock_threshold });
    await db.stock_updates.put({ ...stockUpdate, synced: true });
    emitChange('stock_updates');
    emitChange('products');
    return stockUpdate;
  }

  await db.stock_updates.put({ ...stockUpdate, synced: false });
  await db.products.update(input.product.id, { stock_qty: nextStock, stock_base_units: nextStock });
  emitChange('stock_updates');
  emitChange('products');
  return stockUpdate;
}

export async function syncPendingRecords() {
  if (!navigator.onLine) {
    return;
  }

  const pendingSales = await db.sales.filter((sale) => !sale.synced).toArray();
  for (const sale of pendingSales) {
    const product = await db.products.get(sale.product_id);
    if (!product) {
      continue;
    }

    const packaging = sale.packaging_id ? await db.product_packaging.get(sale.packaging_id) : null;
    if (!packaging) {
      continue;
    }

    const { error: saleError } = await supabase.from('sales').insert({
      id: sale.id,
      product_id: sale.product_id,
      qty: sale.qty,
      total: sale.total,
      recorded_by: sale.recorded_by,
      timestamp: sale.timestamp,
      synced: true,
      packaging_id: sale.packaging_id,
      qty_base_units: sale.qty_base_units,
      unit_price_snapshot: sale.unit_price_snapshot
    });

    if (saleError) {
      continue;
    }

    try {
      await applyInventoryMovementOnline({
        id: sale.id,
        productId: sale.product_id,
        packagingId: packaging.id,
        movementType: 'sale',
        enteredQty: sale.qty,
        recordedBy: sale.recorded_by,
        unitPriceSnapshot: sale.unit_price_snapshot,
        timestamp: sale.timestamp
      });
    } catch {
      continue;
    }

    await db.sales.update(sale.id, { synced: true });
  }

  const pendingStock = await db.stock_updates.filter((stockUpdate) => !stockUpdate.synced).toArray();
  for (const stockUpdate of pendingStock) {
    const product = await db.products.get(stockUpdate.product_id);
    if (!product) {
      continue;
    }

    const packaging = stockUpdate.packaging_id ? await db.product_packaging.get(stockUpdate.packaging_id) : null;
    if (!packaging) {
      continue;
    }

    const { error: stockError } = await supabase.from('stock_updates').insert({
      id: stockUpdate.id,
      product_id: stockUpdate.product_id,
      qty_added: stockUpdate.qty_added,
      recorded_by: stockUpdate.recorded_by,
      timestamp: stockUpdate.timestamp,
      synced: true,
      packaging_id: stockUpdate.packaging_id,
      qty_base_units: stockUpdate.qty_base_units
    });

    if (stockError) {
      continue;
    }

    try {
      await applyInventoryMovementOnline({
        id: stockUpdate.id,
        productId: stockUpdate.product_id,
        packagingId: packaging.id,
        movementType: 'stock_receive',
        enteredQty: stockUpdate.qty_added,
        recordedBy: stockUpdate.recorded_by,
        timestamp: stockUpdate.timestamp,
        unitPriceSnapshot: null
      });
    } catch {
      continue;
    }

    await db.stock_updates.update(stockUpdate.id, { synced: true });
  }

  await refreshProductsFromSupabase();
  await refreshPackagingFromSupabase();
  emitChange('sync');
}
