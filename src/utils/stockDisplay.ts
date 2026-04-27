import type { ProductPackagingRecord, ProductRecord } from '@/types/models';

function pluralize(label: string, count: number) {
  if (count === 1) {
    return label.toLowerCase();
  }

  if (label.toLowerCase().endsWith('s')) {
    return label.toLowerCase();
  }

  return `${label.toLowerCase()}s`;
}

export function getEffectiveStockUnits(product: ProductRecord) {
  return product.stock_base_units ?? product.stock_qty ?? 0;
}

export function formatStockUnitsDisplay(product: ProductRecord) {
  const stockUnits = getEffectiveStockUnits(product);
  return `${stockUnits} ${stockUnits === 1 ? 'unit' : 'units'}`;
}

export function getLowStockThresholdUnits(product: ProductRecord) {
  return product.low_stock_threshold_base_units ?? product.low_stock_threshold ?? 0;
}

export function getWholesalePackaging(productId: string, packagingList: ProductPackagingRecord[]) {
  return (
    packagingList.find((packaging) => packaging.product_id === productId && packaging.is_default && packaging.units_per_package > 1) ??
    packagingList.find((packaging) => packaging.product_id === productId && ['crate', 'carton', 'case'].includes(packaging.label.toLowerCase())) ??
    packagingList.find((packaging) => packaging.product_id === productId && packaging.units_per_package > 1) ??
    null
  );
}

export function formatStockDisplay(product: ProductRecord, packagingList: ProductPackagingRecord[]) {
  const stockUnits = getEffectiveStockUnits(product);
  const wholesalePackaging = getWholesalePackaging(product.id, packagingList);

  if (!wholesalePackaging) {
    const unitName = pluralize(product.base_unit_name ?? 'Bottle', stockUnits);
    return `${stockUnits} ${unitName}`;
  }

  const wholesaleQty = Math.floor(stockUnits / wholesalePackaging.units_per_package);
  const remainder = stockUnits % wholesalePackaging.units_per_package;
  const wholesaleLabel = pluralize(wholesalePackaging.label, wholesaleQty);
  const baseLabel = pluralize(product.base_unit_name ?? 'Bottle', remainder);

  if (remainder === 0) {
    return `${wholesaleQty} ${wholesaleLabel}`;
  }

  if (wholesaleQty === 0) {
    return `${remainder} ${baseLabel}`;
  }

  return `${wholesaleQty} ${wholesaleLabel}, ${remainder} ${baseLabel}`;
}

export function formatPackagingSummary(product: ProductRecord, packagingList: ProductPackagingRecord[]) {
  const stockUnits = getEffectiveStockUnits(product);
  const wholesalePackaging = getWholesalePackaging(product.id, packagingList);
  if (!wholesalePackaging) {
    return null;
  }

  const wholesaleQty = Math.floor(stockUnits / wholesalePackaging.units_per_package);
  const remainder = stockUnits % wholesalePackaging.units_per_package;
  return { wholesalePackaging, wholesaleQty, remainder };
}
