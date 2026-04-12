import { CheckCircle2, Minus, Plus, PackagePlus } from 'lucide-react';
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
import { friendlyError, recordStockUpdate } from '@/lib/sync';
import { formatStockDisplay } from '@/utils/stockDisplay';
import type { ProductCategory, ProductPackagingRecord, ProductRecord } from '@/types/models';

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
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">Stock updated</h2>
        <p className="mt-2 text-sm text-slate-300">The incoming stock was saved successfully.</p>
      </div>
      <Button fullWidth onClick={onReset}>
        Add More Stock
      </Button>
    </Card>
  );
}

export default function StockPage() {
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

  async function handleAddStock() {
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

    setSubmitting(true);
    try {
      await recordStockUpdate({ product: activeProduct, packaging: selectedPackaging, qtyAdded: quantity, recordedBy: employee.id });
      success('Stock updated', `${quantity} item(s) added to stock.`);
      setCompleted(true);
    } catch (error) {
      pushError('Update failed', friendlyError(error, 'Unable to update stock.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return <SuccessState onReset={() => setCompleted(false)} />;
  }

  return (
    <div className="space-y-4 pb-6">
      <Card>
        <p className="text-sm text-slate-400">Tap a product, enter the received quantity, and save the update.</p>
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
              <p className="mt-1 text-sm text-slate-300">Current stock: {formatStockDisplay(activeProduct, productPackagings)}</p>
            </div>
          ) : (
            <EmptyState icon={PackagePlus} title="No product selected" message="Choose a product from the list above." />
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
          <p className="mb-2 text-sm text-slate-400">Quantity Received</p>
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </div>

        {manualError ? <p className="text-sm text-red-400">{manualError}</p> : null}

        <Button fullWidth disabled={submitting || !activeProduct || !selectedPackaging} onClick={handleAddStock}>
          {submitting ? 'Saving...' : 'Add to Stock'}
        </Button>
      </Card>
    </div>
  );
}
