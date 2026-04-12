import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { ProductForm, type ProductFormValues } from '@/components/ProductForm';
import { useToast } from '@/components/ToastProvider';
import { useProducts } from '@/hooks/useProducts';
import { deleteProduct, friendlyError, refreshProductsFromSupabase, saveProduct } from '@/lib/sync';
import { formatCurrency } from '@/utils/formatCurrency';
import type { ProductRecord } from '@/types/models';

function emptyForm(): ProductFormValues {
  return {
    name: '',
    category: 'Beer',
    unit_price: '',
    stock_qty: '',
    low_stock_threshold: '5'
  };
}

export default function ProductsPage() {
  const { products } = useProducts();
  const { error: pushError, success } = useToast();
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [draft, setDraft] = useState<ProductFormValues>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);

  const availableCategories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  function validate(current: ProductFormValues) {
    const nextErrors: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!current.name.trim()) nextErrors.name = 'Name is required.';
    if (!current.category) nextErrors.category = 'Category is required.';
    if (Number(current.unit_price) < 0 || current.unit_price === '') nextErrors.unit_price = 'Enter a valid price.';
    if (Number(current.stock_qty) < 0 || current.stock_qty === '') nextErrors.stock_qty = 'Enter a valid stock quantity.';
    if (Number(current.low_stock_threshold) < 0 || current.low_stock_threshold === '') nextErrors.low_stock_threshold = 'Enter a valid threshold.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function openEdit(product: ProductRecord) {
    setEditingProduct(product);
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

    setSaving(true);
    try {
      await saveProduct({
        id: editingProduct?.id,
        name: draft.name.trim(),
        category: draft.category,
        unit_price: Number(draft.unit_price),
        stock_qty: Number(draft.stock_qty),
        low_stock_threshold: Number(draft.low_stock_threshold)
      });
      success('Saved', editingProduct ? 'Product updated successfully.' : 'Product created successfully.');
      setEditingProduct(null);
      setShowAdd(false);
    } catch (error) {
      pushError('Save failed', friendlyError(error, 'Unable to save product.'));
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
          <h2 className="text-lg font-bold text-slate-50">Product Management</h2>
          <p className="text-sm text-slate-400">Edit, add, and remove products as needed.</p>
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
        {products.map((product) => (
          <Card key={product.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-50">{product.name}</p>
                <p className="text-sm text-slate-400">{product.category} · {formatCurrency(Number(product.unit_price))}</p>
              </div>
              <p className="text-sm text-slate-300">Stock {product.stock_qty}</p>
            </div>
            <div className="flex gap-2">
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
        ))}
      </div>

      <Button className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full shadow-soft" onClick={() => { setShowAdd(true); setEditingProduct(null); setDraft(emptyForm()); setErrors({}); }} aria-label="Add product">
        <Plus className="h-6 w-6" />
      </Button>

      <Modal
        open={Boolean(editingProduct) || showAdd}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        onClose={() => {
          setEditingProduct(null);
          setShowAdd(false);
        }}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => { setEditingProduct(null); setShowAdd(false); }}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <ProductForm values={draft} errors={errors} onChange={setDraft} categories={availableCategories} />
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
    </div>
  );
}
