import { CalendarRange, RefreshCw, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useSalesHistory, useStockUpdates } from '@/hooks/useSales';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateRangeLabel, formatDateTime, formatShortTime } from '@/utils/formatDate';

export default function HistoryPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const { sales, loading } = useSalesHistory(startDate, endDate);
  const { updates } = useStockUpdates();

  const stockInRange = useMemo(
    () => updates.filter((item) => item.timestamp >= `${startDate}T00:00:00.000Z` && item.timestamp <= `${endDate}T23:59:59.999Z`),
    [updates, startDate, endDate]
  );

  const summary = useMemo(() => {
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const inventorySpend = stockInRange.reduce(
      (sum, update) => sum + Number(update.cost_price_per_unit ?? 0) * Number(update.qty_base_units ?? update.qty_added),
      0
    );
    const lastCostByProduct = new Map<string, number>();
    for (const update of [...updates].sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
      if (!lastCostByProduct.has(update.product_id) && Number(update.cost_price_per_unit ?? 0) > 0) {
        lastCostByProduct.set(update.product_id, Number(update.cost_price_per_unit ?? 0));
      }
    }
    const estimatedCogs = sales.reduce((sum, sale) => {
      const costPerUnit = lastCostByProduct.get(sale.product_id) ?? 0;
      return sum + costPerUnit * Number(sale.qty_base_units ?? sale.qty);
    }, 0);
    const estimatedGrossProfit = revenue - estimatedCogs;
    const estimatedMargin = revenue > 0 ? (estimatedGrossProfit / revenue) * 100 : 0;
    return {
      revenue,
      inventorySpend,
      estimatedGrossProfit,
      estimatedMargin,
      transactions: sales.length,
      stockReceipts: stockInRange.length
    };
  }, [sales, stockInRange, updates]);

  return (
    <div className="space-y-4 pb-28">
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-50">Sales History</h2>
            <p className="text-sm text-slate-400">{formatDateRangeLabel(startDate, endDate)}</p>
          </div>
          <CalendarRange className="h-5 w-5 text-amberAccent" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Start Date</label>
            <input value={startDate} type="date" onChange={(event) => setStartDate(event.target.value)} className="h-12 w-full rounded-xl border border-slate-700 bg-navy px-4 text-slate-50 outline-none focus:border-amberAccent" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">End Date</label>
            <input value={endDate} type="date" onChange={(event) => setEndDate(event.target.value)} className="h-12 w-full rounded-xl border border-slate-700 bg-navy px-4 text-slate-50 outline-none focus:border-amberAccent" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="text-sm text-slate-400">Loading sales history...</Card>
      ) : sales.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No sales for this date range" message="Try a different period or refresh when back online." />
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <Card key={sale.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-50">{sale.product_name ?? 'Product'}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatDateTime(sale.timestamp)} · {sale.employee_name ?? 'Employee'} · Qty {sale.qty} {sale.packaging_label ?? 'unit'}(s)
                  </p>
                </div>
                <p className="font-bold text-amberAccent">{formatCurrency(Number(sale.total))}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="space-y-3">
        <h3 className="text-lg font-bold text-slate-50">Stocking Activity</h3>
        {stockInRange.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No stock receipts in this range" message="Stock receipts will appear here when recorded." />
        ) : (
          <div className="space-y-2">
            {stockInRange.map((update) => {
              const units = Number(update.qty_base_units ?? update.qty_added);
              const cost = Number(update.cost_price_per_unit ?? 0);
              return (
                <div key={update.id} className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-50">{update.product_name ?? 'Product'}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatDateTime(update.timestamp)} · {update.employee_name ?? 'Employee'} · +{update.qty_added} {update.packaging_label ?? 'unit'}(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amberAccent">{cost > 0 ? formatCurrency(cost * units) : 'No cost'}</p>
                      <p className="text-xs text-slate-400">{cost > 0 ? `${formatCurrency(cost)}/unit` : 'Cost not recorded'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="fixed bottom-24 left-4 right-4 z-20">
        <Card className="border border-slate-700 bg-slatePanel/98 shadow-soft backdrop-blur">
          <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Total Revenue</p>
              <p className="text-xl font-bold text-slate-50">{formatCurrency(summary.revenue)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Inventory Spend</p>
              <p className="text-xl font-bold text-slate-50">{formatCurrency(summary.inventorySpend)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Gross Profit (Est.)</p>
              <p className="text-xl font-bold text-slate-50">{formatCurrency(summary.estimatedGrossProfit)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Gross Margin (Est.)</p>
              <p className="text-xl font-bold text-slate-50">{summary.estimatedMargin.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Transactions</p>
              <p className="text-xl font-bold text-slate-50">{summary.transactions}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Stock Receipts</p>
              <p className="text-xl font-bold text-slate-50">{summary.stockReceipts}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
