import { CheckCircle2, Plus, Minus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProductPackagingPicker } from '@/components/ProductPackagingPicker';
import { ProductPicker } from '@/components/ProductPicker';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { usePackagings } from '@/hooks/usePackagings';
import { recordSale, friendlyError } from '@/lib/sync';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatStockDisplay, getEffectiveStockUnits } from '@/utils/stockDisplay';
import type { ProductCategory, ProductPackagingRecord, ProductRecord } from '@/types/models';
import { ShoppingCart } from 'lucide-react';

function QuantityStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-2">
      <Button variant="secondary" className="min-h-12 min-w-12 rounded-xl" onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus className="h-5 w-5" />
      </Button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 1))}
        className="h-12 w-full rounded-xl border border-slate-700 bg-navy text-center text-lg font-semibold text-slate-50 outline-none"
      />
      <Button variant="secondary" className="min-h-12 min-w-12 rounded-xl" onClick={() => onChange(value + 1)}>
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 border border-emerald-500/30 bg-emerald-500/10 py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">Sale recorded</h2>
        <p className="mt-2 text-sm text-slate-300">The transaction has been saved and stock updated.</p>
      </div>
      <Button fullWidth onClick={onReset}>
        Record Another
      </Button>
    </Card>
  );
}

export default function SalePage() {
  const { employee } = useAuth();
  const { products } = useProducts();
  const { packagings } = usePackagings();
  const { error: pushError, success } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'All' | ProductCategory>('All');
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [selectedPackaging, setSelectedPackaging] = useState<ProductPackagingRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [manualError, setManualError] = useState('');

  const activeProduct = useMemo(() => products.find((product) => product.id === selectedProduct?.id) ?? null, [products, selectedProduct?.id]);
  const productPackagings = useMemo(
    () => packagings.filter((packaging) => packaging.product_id === activeProduct?.id).sort((a, b) => a.units_per_package - b.units_per_package),
    [activeProduct?.id, packagings]
  );
  const total = Number(selectedPackaging?.selling_price_per_package ?? 0) * quantity;

  useEffect(() => {
    if (!activeProduct) {
      setSelectedPackaging(null);
      return;
    }

    const defaultPackaging =
      productPackagings.find((packaging) => packaging.is_default) ??
      productPackagings.find((packaging) => packaging.units_per_package === 1) ??
      productPackagings[0] ??
      null;

    setSelectedPackaging(defaultPackaging);
  }, [activeProduct, productPackagings]);

  async function handleRecordSale() {
    if (!employee) {
      return;
    }

    if (!activeProduct) {
      setManualError('Select a product first.');
      return;
    }

    if (!selectedPackaging) {
      setManualError('Select a packaging option.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setManualError('Quantity must be at least 1.');
      return;
    }

    const availableUnits = getEffectiveStockUnits(activeProduct);
    const requestedUnits = quantity * selectedPackaging.units_per_package;
    if (requestedUnits > availableUnits) {
      setManualError('Quantity cannot exceed available stock.');
      return;
    }

    setSubmitting(true);
    try {
      await recordSale({ product: activeProduct, packaging: selectedPackaging, qty: quantity, recordedBy: employee.id });
      success('Sale recorded', `${quantity} item(s) sold successfully.`);
      setCompleted(true);
    } catch (error) {
      pushError('Sale failed', friendlyError(error, 'Unable to record sale.'));
    } finally {
      setSubmitting(false);
    }
  }

  function resetSaleForm() {
    setCompleted(false);
    setSelectedProduct(null);
    setSelectedPackaging(null);
    setQuantity(1);
    setSearch('');
    setCategory('All');
    setManualError('');
  }

  if (completed) {
    return <SuccessState onReset={resetSaleForm} />;
  }

  return (
    <div className="space-y-4 pb-6">
      <Card className="space-y-2">
        <p className="text-sm text-slate-400">Select a product, set quantity, and record the sale.</p>
        <div className="rounded-2xl bg-slate-900/40 p-4 text-center">
          <p className="text-sm text-slate-400">Current total</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amberAccent">
            {quantity} × {formatCurrency(Number(selectedPackaging?.selling_price_per_package ?? 0))} = {formatCurrency(total)}
          </p>
        </div>
      </Card>

      <ProductPicker
        search={search}
        category={category}
        products={products}
        selectedId={selectedProduct?.id}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onSelect={(product) => {
          setSelectedProduct(product);
          setManualError('');
        }}
      />

      <Card className="space-y-4">
        <div>
          <p className="text-sm text-slate-400">Selected product</p>
          {activeProduct ? (
            <div className="mt-2 rounded-2xl border border-amberAccent/40 bg-amberAccent/10 p-4">
              <p className="text-base font-semibold text-slate-50">{activeProduct.name}</p>
              <p className="mt-1 text-sm text-slate-300">
                {activeProduct.category} · {formatStockDisplay(activeProduct, productPackagings)}
              </p>
            </div>
          ) : (
            <EmptyState icon={ShoppingCart} title="No product selected" message="Tap a product card above to begin." />
          )}
        </div>

        <ProductPackagingPicker
          packagingOptions={productPackagings}
          selectedPackagingId={selectedPackaging?.id ?? null}
          onSelect={(packaging) => {
            setSelectedPackaging(packaging);
            setManualError('');
          }}
        />

        <div>
          <p className="mb-2 text-sm text-slate-400">Quantity</p>
          <QuantityStepper value={quantity} onChange={(next) => setQuantity(next)} />
        </div>

        {selectedPackaging ? (
          <div className="rounded-2xl bg-slate-900/40 p-4 text-center">
            <p className="text-sm text-slate-400">Selected packaging</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-amberAccent">
              {quantity} × {selectedPackaging.label} = {formatCurrency(total)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{selectedPackaging.units_per_package} base units per {selectedPackaging.label.toLowerCase()}</p>
          </div>
        ) : null}

        {manualError ? <p className="text-sm text-red-400">{manualError}</p> : null}

        <Button fullWidth disabled={submitting || !activeProduct || !selectedPackaging} onClick={handleRecordSale}>
          {submitting ? 'Recording...' : 'Record Sale'}
        </Button>
      </Card>
    </div>
  );
}
