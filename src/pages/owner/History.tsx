import { CalendarRange, RefreshCw, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useSalesHistory } from '@/hooks/useSales';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateRangeLabel, formatDateTime, formatShortTime } from '@/utils/formatDate';

export default function HistoryPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const { sales, loading } = useSalesHistory(startDate, endDate);

  const summary = useMemo(
    () => ({
      revenue: sales.reduce((sum, sale) => sum + Number(sale.total), 0),
      transactions: sales.length
    }),
    [sales]
  );

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

      <div className="fixed bottom-24 left-4 right-4 z-20">
        <Card className="border border-slate-700 bg-slatePanel/98 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Total Revenue</p>
              <p className="text-xl font-bold text-slate-50">{formatCurrency(summary.revenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Transactions</p>
              <p className="text-xl font-bold text-slate-50">{summary.transactions}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
