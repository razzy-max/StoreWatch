import Dexie, { type Table } from 'dexie';
import type { ProductPackagingRecord, ProductRecord, SaleRecord, StockUpdateRecord } from '@/types/models';

export class StoreWatchDB extends Dexie {
  products!: Table<ProductRecord, string>;
  product_packaging!: Table<ProductPackagingRecord, string>;
  sales!: Table<SaleRecord, string>;
  stock_updates!: Table<StockUpdateRecord, string>;

  constructor() {
    super('StoreWatchDB');
    this.version(1).stores({
      products: 'id, name, category, unit_price, stock_qty, low_stock_threshold',
      sales: 'id, product_id, qty, total, recorded_by, timestamp, synced',
      stock_updates: 'id, product_id, qty_added, recorded_by, timestamp, synced'
    });

    this.version(2).stores({
      products: 'id, name, category, unit_price, stock_qty, low_stock_threshold, stock_base_units, low_stock_threshold_base_units',
      product_packaging: 'id, product_id, label, units_per_package, selling_price_per_package, is_default',
      sales: 'id, product_id, qty, total, recorded_by, timestamp, synced, packaging_id, qty_base_units',
      stock_updates: 'id, product_id, qty_added, recorded_by, timestamp, synced, packaging_id, qty_base_units'
    });
  }
}

export const db = new StoreWatchDB();
