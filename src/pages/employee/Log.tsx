import { CalendarDays, ClipboardList } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeLog, useEmployeeStockLog } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatShortTime } from '@/utils/formatDate';

export default function LogPage() {
  const { employee } = useAuth();
  const { sales, loading } = useEmployeeLog(employee?.id);
  const { updates: stockUpdates, loading: loadingStock } = useEmployeeStockLog(employee?.id);
  const { products } = useProducts();

  const enrichedSales = useMemo(
    () =>
      sales.map((sale) => ({
        ...sale,
        product_name: products.find((product) => product.id === sale.product_id)?.name ?? 'Product'
      })),
    [products, sales]
  );

  const revenue = enrichedSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const stockValue = stockUpdates.reduce(
    (sum, item) => sum + Number(item.cost_price_per_unit ?? 0) * Number(item.qty_base_units ?? item.qty_added),
    0
  );

  return (
    <div className="space-y-4 pb-6">
      <Card className="flex items-center justify-between border border-amberAccent/20 bg-amberAccent/10">
        <div>
          <p className="text-sm text-slate-300">Today's revenue</p>
          <p className="mt-1 text-2xl font-bold text-amberAccent">{formatCurrency(revenue)}</p>
        </div>
        <CalendarDays className="h-10 w-10 text-amberAccent" />
      </Card>

      <Card className="flex items-center justify-between border border-emerald-400/20 bg-emerald-400/10">
        <div>
          <p className="text-sm text-slate-300">Today's stocked value</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{formatCurrency(stockValue)}</p>
        </div>
        <ClipboardList className="h-10 w-10 text-emerald-300" />
      </Card>

      {loading ? (
        <Card className="text-sm text-slate-400">Loading your sales log...</Card>
      ) : enrichedSales.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No sales recorded yet today" message="Your transactions for today will appear here." />
      ) : (
        <div className="space-y-3">
          {enrichedSales.map((sale) => (
            <Card key={sale.id} className="animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-50">{sale.product_name}</p>
                  <p className="mt-1 text-sm text-slate-400">Qty {sale.qty} · {formatShortTime(sale.timestamp)}</p>
                </div>
                <p className="text-base font-bold text-emerald-400">{formatCurrency(Number(sale.total))}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="space-y-3">
        <h3 className="text-lg font-bold text-slate-50">My Stock Receipts Today</h3>
        {loadingStock ? (
          <p className="text-sm text-slate-400">Loading your stocking log...</p>
        ) : stockUpdates.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No stock receipts yet today" message="Your stock updates will appear here." />
        ) : (
          <div className="space-y-2">
            {stockUpdates.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-50">{item.product_name ?? 'Product'}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      +{item.qty_added} {item.packaging_label ?? 'unit'}(s) · {formatShortTime(item.timestamp)}
                    </p>
                  </div>
                  <p className="text-base font-bold text-emerald-300">
                    {Number(item.cost_price_per_unit ?? 0) > 0
                      ? formatCurrency(Number(item.cost_price_per_unit) * Number(item.qty_base_units ?? item.qty_added))
                      : 'No cost'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
