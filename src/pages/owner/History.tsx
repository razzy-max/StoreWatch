import { CalendarRange, RefreshCw, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useSalesHistory, useStockUpdates } from '@/hooks/useSales';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateRangeLabel, formatDateTime } from '@/utils/formatDate';
import { calculateInventorySpend, estimateCogsFromCostTimeline } from '@/utils/metrics';

type HistoryView = 'overview' | 'sales' | 'stock';

export default function HistoryPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [view, setView] = useState<HistoryView>('overview');
  const { sales, loading } = useSalesHistory(startDate, endDate);
  const { updates } = useStockUpdates();

  const stockInRange = useMemo(
    () => updates.filter((item) => item.timestamp >= `${startDate}T00:00:00.000Z` && item.timestamp <= `${endDate}T23:59:59.999Z`),
    [updates, startDate, endDate]
  );

  const summary = useMemo(() => {
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const inventorySpend = calculateInventorySpend(stockInRange);
    const estimatedCogs = estimateCogsFromCostTimeline(sales, updates);
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

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-4 pb-6">
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Sales History</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateRangeLabel(startDate, endDate)}</p>
          </div>
          <CalendarRange className="h-5 w-5 text-amberAccent" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Start Date</label>
            <input value={startDate} type="date" onChange={(event) => setStartDate(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:border-slate-700 dark:bg-navy dark:text-slate-50" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">End Date</label>
            <input value={endDate} type="date" onChange={(event) => setEndDate(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:border-slate-700 dark:bg-navy dark:text-slate-50" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={() => applyPreset(1)}>
            Today
          </Button>
          <Button variant="secondary" onClick={() => applyPreset(7)}>
            7D
          </Button>
          <Button variant="secondary" onClick={() => applyPreset(30)}>
            30D
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-300 bg-slate-200 p-1 dark:border-slate-700 dark:bg-slate-900/30">
          <Button variant={view === 'overview' ? 'primary' : 'ghost'} onClick={() => setView('overview')}>
            Overview
          </Button>
          <Button variant={view === 'sales' ? 'primary' : 'ghost'} onClick={() => setView('sales')}>
            Sales
          </Button>
          <Button variant={view === 'stock' ? 'primary' : 'ghost'} onClick={() => setView('stock')}>
            Stock
          </Button>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Revenue</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(summary.revenue)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Inventory Spend</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(summary.inventorySpend)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Gross Profit (Est.)</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(summary.estimatedGrossProfit)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Gross Margin (Est.)</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{summary.estimatedMargin.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Transactions</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{summary.transactions}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Stock Receipts</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{summary.stockReceipts}</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {(view === 'overview' || view === 'sales') && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Sales History</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sales recorded within the selected range.</p>
            </div>
            <ReceiptText className="h-5 w-5 text-amberAccent" />
          </div>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading sales history...</p>
          ) : sales.length === 0 ? (
            <EmptyState icon={ReceiptText} title="No sales for this date range" message="Try a different period or refresh when back online." />
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <Card key={sale.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{sale.product_name ?? 'Product'}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {formatDateTime(sale.timestamp)} · {sale.employee_name ?? 'Employee'} · Qty {sale.qty} {sale.packaging_label ?? 'package'}(s)
                      </p>
                    </div>
                    <p className="font-bold text-amberAccent">{formatCurrency(Number(sale.total))}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {(view === 'overview' || view === 'stock') && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Stocking Activity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Purchase receipts, quantities, and package costs.</p>
            </div>
            <ReceiptText className="h-5 w-5 text-amberAccent" />
          </div>
          {stockInRange.length === 0 ? (
            <EmptyState icon={ReceiptText} title="No stock receipts in this range" message="Stock receipts will appear here when recorded." />
          ) : (
            <div className="space-y-2">
              {stockInRange.map((update) => {
                const packages = Number(update.qty_added);
                const packageCost = Number(update.cost_price_per_package ?? update.cost_price_per_unit ?? 0);
                const packageUnits = Number(update.packaging_units_per_package ?? 1);
                const totalCost = packageCost * packages;
                const recordedByLabel = update.recorded_by_role === 'owner' ? 'Owner' : update.recorded_by_name ?? 'Employee';
                return (
                  <div key={update.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{update.product_name ?? 'Product'}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {formatDateTime(update.timestamp)} · {recordedByLabel} · +{packages} {update.packaging_label ?? 'package'}(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amberAccent">{packageCost > 0 ? formatCurrency(totalCost) : 'No cost'}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {packageCost > 0 ? `${formatCurrency(packageCost)}/${update.packaging_label ?? 'package'} × ${packages} (${packageUnits * packages} base units)` : 'Cost not recorded'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
