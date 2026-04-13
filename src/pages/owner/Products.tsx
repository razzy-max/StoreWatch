import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { ProductForm, type ProductFormValues } from '@/components/ProductForm';
import { PackagingEditor, type PackagingFormValues } from '@/components/PackagingEditor';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { usePackagings } from '@/hooks/usePackagings';
import { deleteProduct, deletePackaging, friendlyError, recordStockUpdate, refreshProductsFromSupabase, saveProduct, savePackaging } from '@/lib/sync';
import { formatCurrency } from '@/utils/formatCurrency';
import type { ProductRecord, ProductPackagingRecord } from '@/types/models';

function emptyForm(): ProductFormValues {
  return {
    name: '',
    category: 'Beer',
    unit_price: '',
    stock_qty: '0',
    low_stock_threshold: '5'
  };
}

export default function ProductsPage() {
  const { owner } = useAuth();
  const { products } = useProducts();
  const { packagings } = usePackagings();
  const { error: pushError, success } = useToast();
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [draft, setDraft] = useState<ProductFormValues>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<ProductPackagingRecord | null>(null);
  const [justSavedProduct, setJustSavedProduct] = useState<ProductRecord | null>(null);
  const [stockPackagingId, setStockPackagingId] = useState('');
  const [stockQty, setStockQty] = useState('1');
  const [stockCostPerPackage, setStockCostPerPackage] = useState('');
  const [recordingStock, setRecordingStock] = useState(false);

  const availableCategories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const productPackagings = useMemo(
    () => packagings.filter((p) => p.product_id === (justSavedProduct?.id || editingProduct?.id)),
    [packagings, justSavedProduct?.id, editingProduct?.id]
  );

  const activeProduct = justSavedProduct || editingProduct;

  useEffect(() => {
    if (!activeProduct) {
      setStockPackagingId('');
      return;
    }

    const defaultPackaging =
      productPackagings.find((packaging) => packaging.is_default) ??
      productPackagings.find((packaging) => packaging.units_per_package === 1) ??
      productPackagings[0] ??
      null;

    setStockPackagingId(defaultPackaging?.id ?? '');
  }, [activeProduct, productPackagings]);

  function validate(current: ProductFormValues) {
    const nextErrors: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!current.name.trim()) nextErrors.name = 'Name is required.';
    if (!current.category) nextErrors.category = 'Category is required.';
    if (Number(current.unit_price) < 0 || current.unit_price === '') nextErrors.unit_price = 'Enter a valid price.';
    if (Number(current.low_stock_threshold) < 0 || current.low_stock_threshold === '') nextErrors.low_stock_threshold = 'Enter a valid threshold.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function openEdit(product: ProductRecord) {
    setEditingProduct(product);
    setJustSavedProduct(null);
    setDraft({
      name: product.name,
      category: product.category,
      unit_price: String(product.unit_price),
      stock_qty: String(product.stock_qty),
      low_stock_threshold: String(product.low_stock_threshold)
    });
    setErrors({});
    setShowAdd(false);
  }

  async function handleSave() {
    if (!validate(draft)) {
      return;
    }

    const targetProduct = editingProduct || justSavedProduct;
    const latestTargetProduct = targetProduct
      ? products.find((product) => product.id === targetProduct.id) ?? targetProduct
      : null;

    setSaving(true);
    try {
      const savedProduct = await saveProduct({
        id: latestTargetProduct?.id,
        name: draft.name.trim(),
        category: draft.category,
        unit_price: Number(draft.unit_price),
        stock_qty: latestTargetProduct ? Number(latestTargetProduct.stock_qty) : 0,
        low_stock_threshold: Number(draft.low_stock_threshold)
      });
      success('Saved', latestTargetProduct ? 'Product updated successfully.' : 'Product created successfully.');
      
      // For new products, show packaging editor
      if (!latestTargetProduct) {
        setJustSavedProduct(savedProduct);
      } else {
        setEditingProduct(null);
        setShowAdd(false);
        setJustSavedProduct(null);
      }
    } catch (error) {
      pushError('Save failed', friendlyError(error, 'Unable to save product.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPackaging(packaging: PackagingFormValues) {
    const product = activeProduct;
    if (!product) return;

    setSaving(true);
    try {
      await savePackaging({
        product_id: product.id,
        label: packaging.label,
        units_per_package: Number(packaging.units_per_package),
        selling_price_per_package: Number(packaging.selling_price_per_package)
      });
      success('Added', packaging.label + ' pricing tier added.');
    } catch (error) {
      pushError('Failed to add packaging', friendlyError(error, 'Unable to add pricing tier.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordStock() {
    if (!owner) {
      pushError('Not signed in', 'Owner session is required to record stock.');
      return;
    }

    if (!activeProduct) {
      pushError('No product', 'Save the product before recording stock.');
      return;
    }

    const packaging = productPackagings.find((item) => item.id === stockPackagingId);
    if (!packaging) {
      pushError('No tier selected', 'Choose a pricing tier before recording stock.');
      return;
    }

    const qtyValue = Number(stockQty);
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      pushError('Invalid quantity', 'Enter a valid stock quantity.');
      return;
    }

    const qtyBaseUnits = qtyValue * Number(packaging.units_per_package || 1);

    setRecordingStock(true);
    try {
      await recordStockUpdate({
        product: activeProduct,
        packaging,
        qtyAdded: qtyValue,
        recordedBy: owner.id,
        costPricePerPackage: stockCostPerPackage ? Number(stockCostPerPackage) : undefined
      });
      success('Stock recorded', 'Opening stock was saved with a purchase cost.');
      setStockQty('1');
      setStockCostPerPackage('');
      setJustSavedProduct((current) => {
        if (!current || current.id !== activeProduct.id) {
          return current;
        }

        return {
          ...current,
          stock_qty: Number(current.stock_qty || 0) + qtyBaseUnits,
          stock_base_units: Number(current.stock_base_units || current.stock_qty || 0) + qtyBaseUnits
        };
      });
    } catch (error) {
      pushError('Stock failed', friendlyError(error, 'Unable to record stock.'));
    } finally {
      setRecordingStock(false);
    }
  }

  async function handleDeletePackaging() {
    if (!packageToDelete) return;

    setSaving(true);
    try {
      await deletePackaging(packageToDelete.id);
      success('Deleted', packageToDelete.label + ' removed.');
      setPackageToDelete(null);
    } catch (error) {
      pushError('Failed to delete', friendlyError(error, 'Unable to delete pricing tier.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);
    try {
      await deleteProduct(deleteTarget.id);
      success('Deleted', `${deleteTarget.name} removed from the catalog.`);
      setDeleteTarget(null);
    } catch (error) {
      pushError('Delete failed', friendlyError(error, 'Unable to delete product.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setSaving(true);
    try {
      await refreshProductsFromSupabase();
      success('Refreshed', 'Products synchronized.');
    } catch (error) {
      pushError('Refresh failed', friendlyError(error, 'Unable to refresh products.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <Card className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Product Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Edit, add, and remove products as needed.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRefresh} disabled={saving}>
            Refresh
          </Button>
          <Button onClick={() => { setShowAdd(true); setEditingProduct(null); setDraft(emptyForm()); setErrors({}); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {products.map((product) => {
          const tiers = packagings.filter((p) => p.product_id === product.id);
          return (
            <Card key={product.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{product.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{product.category} · {formatCurrency(Number(product.unit_price))}</p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Stock {product.stock_qty}</p>
              </div>

              {tiers.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-800/30">
                  <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Pricing Tiers:</p>
                  <div className="space-y-1">
                    {tiers.map((pkg) => (
                      <div key={pkg.id} className="flex items-center justify-between rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700/50">
                        <span>{pkg.label} ({pkg.units_per_package}) @ {formatCurrency(Number(pkg.selling_price_per_package))}</span>
                        <button
                          onClick={() => setPackageToDelete(pkg)}
                          className="opacity-0 transition-opacity hover:opacity-100"
                          aria-label="Delete packaging"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingProduct(product);
                  }}
                  fullWidth
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Manage Product
                </Button>
                <Button variant="secondary" fullWidth onClick={() => openEdit(product)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="danger" fullWidth onClick={() => setDeleteTarget(product)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Button className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full shadow-soft" onClick={() => { setShowAdd(true); setEditingProduct(null); setDraft(emptyForm()); setErrors({}); }} aria-label="Add product">
        <Plus className="h-6 w-6" />
      </Button>

      <Modal
        open={Boolean(editingProduct) || showAdd}
        title={editingProduct ? 'Manage Product' : 'Add Product'}
        onClose={() => {
          setEditingProduct(null);
          setShowAdd(false);
          setJustSavedProduct(null);
        }}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => { setEditingProduct(null); setShowAdd(false); setJustSavedProduct(null); }}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">1. Product details</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Start with the name, category, and low stock threshold.</p>
          </div>

          <ProductForm values={draft} errors={errors} onChange={setDraft} categories={availableCategories} showInitialStock={false} />

          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">2. Pricing tiers</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add the package labels, pack sizes, and selling prices here.</p>
          </div>

          {justSavedProduct || editingProduct ? (
            <PackagingEditor
              packagings={productPackagings}
              onAdd={handleAddPackaging}
              onRemove={(id) => setPackageToDelete(productPackagings.find((p) => p.id === id) || null)}
            />
          ) : (
            <Card className="border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20">
              <p className="text-sm text-slate-500 dark:text-slate-400">Save the product details once, then add tiers in this same window.</p>
            </Card>
          )}

          {activeProduct ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900/30">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">3. Opening stock</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Record the first stock receipt right after the tiers are ready.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Pricing tier</label>
                <select
                  value={stockPackagingId}
                  onChange={(event) => setStockPackagingId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {productPackagings.length === 0 ? (
                    <option value="">Add a tier first</option>
                  ) : (
                    productPackagings.map((packaging) => (
                      <option key={packaging.id} value={packaging.id}>
                        {packaging.label} ({packaging.units_per_package})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Quantity received</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={stockQty}
                    onChange={(event) => setStockQty(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Purchase cost per package</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockCostPerPackage}
                    onChange={(event) => setStockCostPerPackage(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <Button onClick={handleRecordStock} disabled={recordingStock || productPackagings.length === 0} fullWidth>
                {recordingStock ? 'Recording stock...' : 'Save opening stock'}
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Product"
        message={`Delete ${deleteTarget?.name ?? 'this product'}? This action cannot be undone.`}
        confirmLabel={saving ? 'Deleting...' : 'Delete'}
        confirmTone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={Boolean(packageToDelete)}
        title="Delete Pricing Tier"
        message={'Delete ' + (packageToDelete?.label || 'this tier') + '? This action cannot be undone.'}
        confirmLabel={saving ? 'Deleting...' : 'Delete'}
        confirmTone="danger"
        onCancel={() => setPackageToDelete(null)}
        onConfirm={handleDeletePackaging}
      />
    </div>
  );
}
