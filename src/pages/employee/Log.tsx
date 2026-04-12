import { CalendarDays, ClipboardList } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeLog } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatShortTime } from '@/utils/formatDate';

export default function LogPage() {
  const { employee } = useAuth();
  const { sales, loading } = useEmployeeLog(employee?.id);
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

  return (
    <div className="space-y-4 pb-6">
      <Card className="flex items-center justify-between border border-amberAccent/20 bg-amberAccent/10">
        <div>
          <p className="text-sm text-slate-300">Today's revenue</p>
          <p className="mt-1 text-2xl font-bold text-amberAccent">{formatCurrency(revenue)}</p>
        </div>
        <CalendarDays className="h-10 w-10 text-amberAccent" />
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
    </div>
  );
}
