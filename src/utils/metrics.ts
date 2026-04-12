import type { SaleView, StockUpdateView } from '@/types/models';

export type MetricRange = 'today' | '7d' | '30d';

export function getRangeDates(range: MetricRange): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);

  if (range === 'today') {
    return { startDate: endDate, endDate };
  }

  const days = range === '7d' ? 6 : 29;
  const start = new Date(now);
  start.setDate(now.getDate() - days);
  return { startDate: start.toISOString().slice(0, 10), endDate };
}

export function filterUpdatesByDateRange(updates: StockUpdateView[], startDate: string, endDate: string): StockUpdateView[] {
  const from = new Date(`${startDate}T00:00:00.000Z`).toISOString();
  const to = new Date(`${endDate}T23:59:59.999Z`).toISOString();
  return updates.filter((item) => item.timestamp >= from && item.timestamp <= to);
}

export function calculateInventorySpend(updates: StockUpdateView[]): number {
  return updates.reduce((sum, update) => {
    const cost = Number(update.cost_price_per_unit ?? 0);
    const units = Number(update.qty_base_units ?? update.qty_added);
    return sum + cost * units;
  }, 0);
}

export function estimateCogsFromCostTimeline(sales: SaleView[], updates: StockUpdateView[]): number {
  const updatesByProduct = new Map<string, StockUpdateView[]>();

  for (const update of updates) {
    const cost = Number(update.cost_price_per_unit ?? 0);
    if (cost <= 0) {
      continue;
    }

    const list = updatesByProduct.get(update.product_id) ?? [];
    list.push(update);
    updatesByProduct.set(update.product_id, list);
  }

  for (const list of updatesByProduct.values()) {
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  let cogs = 0;

  for (const sale of sales) {
    const productUpdates = updatesByProduct.get(sale.product_id) ?? [];
    let matchedCost = 0;

    for (let i = productUpdates.length - 1; i >= 0; i -= 1) {
      if (productUpdates[i].timestamp <= sale.timestamp) {
        matchedCost = Number(productUpdates[i].cost_price_per_unit ?? 0);
        break;
      }
    }

    const qtyUnits = Number(sale.qty_base_units ?? sale.qty);
    cogs += matchedCost * qtyUnits;
  }

  return cogs;
}