import { ArrowRight, AlertTriangle, TrendingUp, ShoppingBag, Zap, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerRecentSales, useSalesHistory, useStockUpdates } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { usePackagings } from '@/hooks/usePackagings';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatShortTime } from '@/utils/formatDate';
import { formatStockDisplay, getLowStockThresholdUnits, getEffectiveStockUnits } from '@/utils/stockDisplay';
import {
  calculateInventorySpend,
  estimateCogsFromCostTimeline,
  filterUpdatesByDateRange,
  getRangeDates,
  type MetricRange
} from '@/utils/metrics';

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

function SummaryCard({ title, value, accent = false, info }: { title: string; value: string; accent?: boolean; info?: string }) {
  return (
    <Card className={`space-y-1 ${accent ? 'border border-amberAccent/30 bg-amberAccent/10' : ''}`}>
      <div className="flex items-center gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        {info ? (
          <span title={info} className="inline-flex">
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </span>
        ) : null}
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { owner } = useAuth();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { packagings } = usePackagings();
  const [range, setRange] = useState<MetricRange>('today');
  const { startDate, endDate } = getRangeDates(range);
  const { sales: periodSales } = useSalesHistory(startDate, endDate);
  const { sales: recentSales } = useOwnerRecentSales();
  const { updates: stockUpdates } = useStockUpdates();

  const lowStockProducts = useMemo(
    () => products.filter((product) => getEffectiveStockUnits(product) <= getLowStockThresholdUnits(product)),
    [products]
  );

  const stockInRange = useMemo(
    () => filterUpdatesByDateRange(stockUpdates, startDate, endDate),
    [stockUpdates, startDate, endDate]
  );
  const revenue = periodSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const salesCount = periodSales.length;
  const inventorySpend = calculateInventorySpend(stockInRange);
  const estimatedCogs = estimateCogsFromCostTimeline(periodSales, stockUpdates);
  const estimatedGrossProfit = revenue - estimatedCogs;
  const estimatedMargin = revenue > 0 ? (estimatedGrossProfit / revenue) * 100 : 0;
  const rangeLabel = range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days';

  return (
    <div className="space-y-4 pb-6">
      <Card className="bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">{owner ? greeting(owner.name) : 'Welcome back'}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Store overview</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Live sales, stock receipts, and estimated package-level margins for {rangeLabel.toLowerCase()}.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant={range === 'today' ? 'primary' : 'secondary'} onClick={() => setRange('today')}>
            Today
          </Button>
          <Button variant={range === '7d' ? 'primary' : 'secondary'} onClick={() => setRange('7d')}>
            7D
          </Button>
          <Button variant={range === '30d' ? 'primary' : 'secondary'} onClick={() => setRange('30d')}>
            30D
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard title={`${rangeLabel} Revenue`} value={formatCurrency(revenue)} accent />
        <SummaryCard title="Sales Count" value={`${salesCount}`} />
        <SummaryCard title="Inventory Spend" value={formatCurrency(inventorySpend)} info="Estimated purchase cost for stock receipts within this date range." />
        <SummaryCard title="Gross Margin (Est.)" value={`${estimatedMargin.toFixed(1)}%`} info="Estimated margin from revenue minus estimated COGS from recorded stock costs." />
      </div>

      <Card className="py-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Gross Profit (Est.): <span className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(estimatedGrossProfit)}</span> · Low Stock Items: <span className="font-semibold text-slate-900 dark:text-slate-50">{lowStockProducts.length}</span>
        </p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Low Stock Alert</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tap an item to open inventory.</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-amberAccent" />
        </div>
        {lowStockProducts.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="All stock levels look healthy" message="Products at or below threshold will appear here." />
        ) : (
          <div className="space-y-2">
            {lowStockProducts.slice(0, 5).map((product) => (
              <button
                key={product.id}
                onClick={() => navigate('/owner/inventory')}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-amberAccent/40 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{product.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Current stock: {formatStockDisplay(product, packagings)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="border-t border-slate-200 pt-2 dark:border-slate-700" />

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Recent Sales</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Live feed from Supabase.</p>
          </div>
          <TrendingUp className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="space-y-2">
          {recentSales.length === 0 ? (
            <EmptyState icon={Zap} title="No recent sales yet" message="Transactions will appear here as they are recorded." />
          ) : (
            recentSales.map((sale, index) => (
              <div
                key={sale.id}
                className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40 ${index === 0 ? 'animate-slide-in-down' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{sale.product_name ?? 'Product'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Qty {sale.qty} {sale.packaging_label ?? 'unit'}(s) · {sale.employee_name ?? 'Employee'} · {formatShortTime(sale.timestamp)}
                    </p>
                  </div>
                  <p className="font-bold text-amberAccent">{formatCurrency(Number(sale.total))}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Recent Stock Activity</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Incoming stock and purchase costs.</p>
          </div>
          <ShoppingBag className="h-5 w-5 text-amberAccent" />
        </div>
        {stockUpdates.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No stock updates yet" message="Stock receipts will appear here." />
        ) : (
          <div className="space-y-2">
            {stockUpdates.slice(0, 8).map((update) => {
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
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        +{packages} {update.packaging_label ?? 'package'}(s) · {recordedByLabel} · {formatShortTime(update.timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amberAccent">{packageCost > 0 ? formatCurrency(totalCost) : 'No cost'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {packageCost > 0 ? `${formatCurrency(packageCost)}/${update.packaging_label ?? 'package'} × ${packages} = ${packageUnits * packages} base units` : 'Cost not recorded'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
