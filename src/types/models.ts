export type UserRole = 'owner' | 'employee';
export type ProductCategory = string;

export interface UserRecord {
  id: string;
  name: string;
  role: UserRole;
  pin?: string | null;
  created_at?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: ProductCategory;
  unit_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  base_unit_name?: string;
  stock_base_units?: number;
  low_stock_threshold_base_units?: number;
  created_at?: string;
}

export interface ProductPackagingRecord {
  id: string;
  product_id: string;
  label: string;
  units_per_package: number;
  selling_price_per_package: number;
  is_default: boolean;
  created_at?: string;
}

export interface SaleRecord {
  id: string;
  product_id: string;
  qty: number;
  total: number;
  recorded_by: string;
  timestamp: string;
  synced: boolean;
  packaging_id?: string | null;
  qty_base_units?: number | null;
  unit_price_snapshot?: number | null;
}

export interface StockUpdateRecord {
  id: string;
  product_id: string;
  qty_added: number;
  recorded_by: string;
  timestamp: string;
  synced: boolean;
  packaging_id?: string | null;
  qty_base_units?: number | null;
  cost_price_per_unit?: number | null;
  cost_price_per_package?: number | null;
}

export interface EmployeeSession {
  id: string;
  name: string;
  role: 'employee';
}

export interface OwnerSession {
  id: string;
  name: string;
  role: 'owner';
}

export interface SaleView extends SaleRecord {
  product_name?: string;
  employee_name?: string;
  packaging_label?: string;
}

export interface StockUpdateView extends StockUpdateRecord {
  product_name?: string;
  employee_name?: string;
  packaging_label?: string;
  packaging_units_per_package?: number;
}
