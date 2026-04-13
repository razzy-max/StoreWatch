import { CheckCircle2, Plus, Minus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

interface CartItem {
  id: string;
  productId: string;
  packagingId: string;
  qty: number;
}

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

function SuccessState({ onReset, items }: { onReset: () => void; items: number }) {
  return (
    <Card className="flex flex-col items-center gap-4 border border-emerald-500/30 bg-emerald-500/10 py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Sale recorded</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{items} line item(s) were saved and stock has been updated.</p>
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [completedItems, setCompletedItems] = useState(0);
  const [manualError, setManualError] = useState('');
  const [focusCartCue, setFocusCartCue] = useState(false);
  const saleComposerRef = useRef<HTMLDivElement | null>(null);
  const cartCueTimerRef = useRef<number | null>(null);

  const activeProduct = useMemo(() => products.find((product) => product.id === selectedProduct?.id) ?? null, [products, selectedProduct?.id]);
  const productPackagings = useMemo(
    () => packagings.filter((packaging) => packaging.product_id === activeProduct?.id).sort((a, b) => a.units_per_package - b.units_per_package),
    [activeProduct?.id, packagings]
  );
  const selectedLineTotal = Number(selectedPackaging?.selling_price_per_package ?? 0) * quantity;

  const cartSummary = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const packaging = packagings.find((p) => p.id === item.packagingId);
        if (!product || !packaging) {
          return null;
        }

        return {
          ...item,
          product,
          packaging,
          lineTotal: Number(packaging.selling_price_per_package) * item.qty,
          baseUnits: Number(packaging.units_per_package) * item.qty
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [cartItems, products, packagings]);

  const cartTotal = useMemo(() => cartSummary.reduce((sum, item) => sum + item.lineTotal, 0), [cartSummary]);

  function scrollToSaleComposer() {
    saleComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function flashCartCue() {
    setFocusCartCue(true);
    if (cartCueTimerRef.current) {
      window.clearTimeout(cartCueTimerRef.current);
    }
    cartCueTimerRef.current = window.setTimeout(() => setFocusCartCue(false), 900);
  }

  function reservedUnitsForProduct(productId: string) {
    return cartSummary
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.baseUnits, 0);
  }

  function addCurrentSelectionToCart() {
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

    const requestedUnits = quantity * Number(selectedPackaging.units_per_package);
    const alreadyReserved = reservedUnitsForProduct(activeProduct.id);
    const availableUnits = getEffectiveStockUnits(activeProduct);

    if (alreadyReserved + requestedUnits > availableUnits) {
      setManualError('Quantity exceeds available stock for this product.');
      return;
    }

    setCartItems((current) => {
      const existing = current.find((item) => item.productId === activeProduct.id && item.packagingId === selectedPackaging.id);
      if (existing) {
        return current.map((item) => (item.id === existing.id ? { ...item, qty: item.qty + quantity } : item));
      }

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          productId: activeProduct.id,
          packagingId: selectedPackaging.id,
          qty: quantity
        }
      ];
    });

    setManualError('');
    success('Added to cart', `${quantity} ${selectedPackaging.label}(s) added.`);
    setQuantity(1);
  }

  function updateCartQty(itemId: string, nextQty: number) {
    if (nextQty <= 0) {
      setCartItems((current) => current.filter((item) => item.id !== itemId));
      return;
    }

    setCartItems((current) => current.map((item) => (item.id === itemId ? { ...item, qty: nextQty } : item)));
  }

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

  useEffect(
    () => () => {
      if (cartCueTimerRef.current) {
        window.clearTimeout(cartCueTimerRef.current);
      }
    },
    []
  );

  async function handleRecordSale() {
    if (!employee) {
      return;
    }

    if (cartSummary.length === 0) {
      setManualError('Add at least one product to the sale cart.');
      return;
    }

    setSubmitting(true);
    try {
      const workingStock = new Map(products.map((product) => [product.id, { ...product }]));

      for (const item of cartSummary) {
        const liveProduct = workingStock.get(item.product.id);
        if (!liveProduct) {
          throw new Error('Product is no longer available.');
        }

        const availableUnits = getEffectiveStockUnits(liveProduct);
        const requestedUnits = item.qty * Number(item.packaging.units_per_package);
        if (requestedUnits > availableUnits) {
          throw new Error(`Insufficient stock for ${item.product.name}.`);
        }

        await recordSale({
          product: liveProduct,
          packaging: item.packaging,
          qty: item.qty,
          recordedBy: employee.id
        });

        workingStock.set(item.product.id, {
          ...liveProduct,
          stock_qty: Number(liveProduct.stock_qty) - requestedUnits,
          stock_base_units: Number((liveProduct.stock_base_units ?? liveProduct.stock_qty) || 0) - requestedUnits
        });
      }

      success('Sale recorded', `${cartSummary.length} line item(s) sold successfully.`);
      setCompletedItems(cartSummary.length);
    } catch (error) {
      pushError('Sale failed', friendlyError(error, 'Unable to record sale.'));
    } finally {
      setSubmitting(false);
    }
  }

  function resetSaleForm() {
    setCompletedItems(0);
    setSelectedProduct(null);
    setSelectedPackaging(null);
    setQuantity(1);
    setCartItems([]);
    setSearch('');
    setCategory('All');
    setManualError('');
  }

  if (completedItems > 0) {
    return <SuccessState onReset={resetSaleForm} items={completedItems} />;
  }

  return (
    <div className="space-y-4 pb-6">
      <Card className="space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Select products, add them to cart, and record one sale batch.</p>
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
          requestAnimationFrame(scrollToSaleComposer);
          flashCartCue();
        }}
      />

      <div ref={saleComposerRef}>
        <Card className={`space-y-4 transition-all duration-300 ${focusCartCue ? 'ring-2 ring-amberAccent/60 animate-pulse' : ''}`}>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Selected product</p>
          {activeProduct ? (
            <div className="mt-2 rounded-2xl border border-amberAccent/40 bg-amberAccent/10 p-4">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{activeProduct.name}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
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
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Quantity</p>
          <QuantityStepper value={quantity} onChange={(next) => setQuantity(next)} />
        </div>

        {selectedPackaging ? (
          <div className="rounded-2xl bg-slate-200 p-4 text-center dark:bg-slate-900/40">
            <p className="text-sm text-slate-600 dark:text-slate-400">Selected packaging</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-amberAccent">
              {quantity} × {selectedPackaging.label} = {formatCurrency(selectedLineTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{selectedPackaging.units_per_package} base units per {selectedPackaging.label.toLowerCase()}</p>
          </div>
        ) : null}

        <Button variant="secondary" fullWidth disabled={!activeProduct || !selectedPackaging} onClick={addCurrentSelectionToCart}>
          Add Item To Sale
        </Button>

        {cartSummary.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sale cart</p>
            {cartSummary.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{item.product.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{item.packaging.label} · {formatCurrency(Number(item.packaging.selling_price_per_package))}</p>
                  </div>
                  <Button variant="ghost" className="min-h-8 p-1 text-red-500" onClick={() => setCartItems((current) => current.filter((entry) => entry.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="min-h-8 min-w-8 px-2 py-1" onClick={() => updateCartQty(item.id, item.qty - 1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="min-w-10 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{item.qty}</span>
                    <Button variant="secondary" className="min-h-8 min-w-8 px-2 py-1" onClick={() => updateCartQty(item.id, item.qty + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm font-bold text-amberAccent">{formatCurrency(item.lineTotal)}</p>
                </div>
              </div>
            ))}

            <div className="rounded-2xl bg-slate-200 p-4 text-center dark:bg-slate-900/40">
              <p className="text-sm text-slate-600 dark:text-slate-400">Cart total</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-amberAccent">{formatCurrency(cartTotal)}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{cartSummary.length} line item(s)</p>
            </div>
          </div>
        ) : null}

        {manualError ? <p className="text-sm text-red-400">{manualError}</p> : null}

        <Button fullWidth disabled={submitting || cartSummary.length === 0} onClick={handleRecordSale}>
          {submitting ? 'Recording...' : `Record Sale (${cartSummary.length})`}
        </Button>
        </Card>
      </div>
    </div>
  );
}
