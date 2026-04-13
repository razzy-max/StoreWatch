import { Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { ProductForm, type ProductFormValues } from '@/components/ProductForm';
import { useToast } from '@/components/ToastProvider';
import { useProducts } from '@/hooks/useProducts';
import { usePackagings } from '@/hooks/usePackagings';
import { friendlyError, refreshProductsFromSupabase, saveProduct } from '@/lib/sync';
import { formatCurrency } from '@/utils/formatCurrency';
import type { ProductCategory, ProductRecord } from '@/types/models';
import { formatStockDisplay } from '@/utils/stockDisplay';

function getBadgeClass(product: ProductRecord) {
  if (product.stock_qty <= product.low_stock_threshold) {
    return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40';
  }

  if (product.stock_qty <= product.low_stock_threshold + 3) {
    return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40';
  }

  return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40';
}

function emptyForm(): ProductFormValues {
  return {
    name: '',
    category: 'Beer',
    unit_price: '',
    stock_qty: '',
    low_stock_threshold: '5'
  };
}

export default function InventoryPage() {
  const { products } = useProducts();
  const { packagings } = usePackagings();
  const { error: pushError, success } = useToast();
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [values, setValues] = useState<ProductFormValues>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const groupedProducts = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category)))
        .sort((a, b) => a.localeCompare(b))
        .map((category) => ({
          category,
          items: products.filter(
            (product) =>
              product.category === category &&
              product.name.toLowerCase().includes(search.trim().toLowerCase())
          )
        }))
        .filter((group) => group.items.length > 0),
    [products, search]
  );

  const availableCategories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  function openEditor(product: ProductRecord) {
    setEditingProduct(product);
    setValues({
      name: product.name,
      category: product.category,
      unit_price: String(product.unit_price),
      stock_qty: String(product.stock_qty),
      low_stock_threshold: String(product.low_stock_threshold)
    });
    setErrors({});
    setAdding(false);
  }

  function openCreator() {
    setEditingProduct(null);
    setValues(emptyForm());
    setErrors({});
    setAdding(true);
  }

  function validate(current: ProductFormValues) {
    const nextErrors: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!current.name.trim()) {
      nextErrors.name = 'Name is required.';
    }
    if (!current.category) {
      nextErrors.category = 'Category is required.';
    }
    if (!current.unit_price || Number(current.unit_price) < 0) {
      nextErrors.unit_price = 'Enter a valid unit price.';
    }
    if (!current.stock_qty || Number(current.stock_qty) < 0) {
      nextErrors.stock_qty = 'Enter a valid stock quantity.';
    }
    if (!current.low_stock_threshold || Number(current.low_stock_threshold) < 0) {
      nextErrors.low_stock_threshold = 'Enter a valid threshold.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!validate(values)) {
      return;
    }

    setSaving(true);
    try {
      await saveProduct({
        id: editingProduct?.id,
        name: values.name.trim(),
        category: values.category,
        unit_price: Number(values.unit_price),
        stock_qty: Number(values.stock_qty),
        low_stock_threshold: Number(values.low_stock_threshold)
      });
      success('Product saved', editingProduct ? 'Product changes updated.' : 'New product created.');
      setEditingProduct(null);
      setAdding(false);
    } catch (error) {
      pushError('Save failed', friendlyError(error, 'Unable to save product.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setSaving(true);
    try {
      await refreshProductsFromSupabase();
      success('Refreshed', 'Inventory synced from Supabase.');
    } catch (error) {
      pushError('Refresh failed', friendlyError(error, 'Unable to refresh inventory.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <Card className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Grouped by category with live stock badges.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="min-h-12 min-w-12 rounded-xl" onClick={handleRefresh} disabled={saving}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button className="min-h-12 min-w-12 rounded-xl" onClick={openCreator}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      <Card>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Search products</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product name"
            className="h-12 w-full rounded-xl border border-slate-300 bg-slate-100 pl-10 pr-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-amberAccent dark:border-slate-700 dark:bg-navy dark:text-slate-50"
          />
        </div>
      </Card>

      <div className="space-y-4">
        {groupedProducts.map((group) => (
          <section key={group.category} className="space-y-2">
            <div className="sticky top-0 z-10 -mx-4 border-y border-slate-300 bg-slate-200/95 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-navy/95">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400">{group.category}</p>
            </div>
            <div className="space-y-2">
              {group.items.map((product) => (
                <button key={product.id} onClick={() => openEditor(product)} className="w-full text-left">
                  <Card className="flex items-center justify-between gap-3 transition hover:border-amberAccent/30">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{product.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{formatStockDisplay(product, packagings)}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-500">{formatCurrency(Number(product.unit_price))}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClass(product)}`}>{product.stock_qty} in stock</span>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ))}

        {groupedProducts.length === 0 ? (
          <Card className="text-sm text-slate-600 dark:text-slate-400">No products match your search.</Card>
        ) : null}
      </div>

      <Button className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full shadow-soft" onClick={openCreator} aria-label="Add product">
        <Plus className="h-6 w-6" />
      </Button>

      <Modal
        open={Boolean(editingProduct) || adding}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        onClose={() => {
          setEditingProduct(null);
          setAdding(false);
        }}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => {
              setEditingProduct(null);
              setAdding(false);
            }}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <ProductForm values={values} errors={errors} onChange={setValues} categories={availableCategories} />
      </Modal>
    </div>
  );
}
