import { ArrowRight, AlertTriangle, TrendingUp, ShoppingBag, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerRecentSales, useSalesHistory } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { usePackagings } from '@/hooks/usePackagings';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatShortTime } from '@/utils/formatDate';
import { formatStockDisplay, getLowStockThresholdUnits, getEffectiveStockUnits } from '@/utils/stockDisplay';

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

function SummaryCard({ title, value, accent = false }: { title: string; value: string; accent?: boolean }) {
  return (
    <Card className={`space-y-1 ${accent ? 'border border-amberAccent/30 bg-amberAccent/10' : ''}`}>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-2xl font-bold tracking-tight text-slate-50">{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { owner } = useAuth();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { packagings } = usePackagings();
  const today = new Date().toISOString().slice(0, 10);
  const { sales: todaySales } = useSalesHistory(today, today);
  const { sales: recentSales } = useOwnerRecentSales();

  const lowStockProducts = useMemo(
    () => products.filter((product) => getEffectiveStockUnits(product) <= getLowStockThresholdUnits(product)),
    [products]
  );

  const revenue = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const salesCount = todaySales.length;

  return (
    <div className="space-y-4 pb-6">
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900">
        <p className="text-sm text-slate-400">{owner ? greeting(owner.name) : 'Welcome back'}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-50">Store overview</h2>
        <p className="mt-2 text-sm text-slate-300">Live sales, low stock alerts, and inventory health in one glance.</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard title="Today's Revenue" value={formatCurrency(revenue)} accent />
        <SummaryCard title="Sales Count" value={`${salesCount}`} />
        <SummaryCard title="Low Stock Items" value={`${lowStockProducts.length}`} />
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-50">Low Stock Alert</h3>
            <p className="text-sm text-slate-400">Tap an item to open inventory.</p>
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
                className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-left transition hover:border-amberAccent/40"
              >
                <div>
                  <p className="font-semibold text-slate-50">{product.name}</p>
                  <p className="text-sm text-slate-400">Current stock: {formatStockDisplay(product, packagings)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-50">Recent Sales</h3>
            <p className="text-sm text-slate-400">Live feed from Supabase.</p>
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
                className={`rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 ${index === 0 ? 'animate-slide-in-down' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-50">{sale.product_name ?? 'Product'}</p>
                    <p className="text-sm text-slate-400">
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
    </div>
  );
}
