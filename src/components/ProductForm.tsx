import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProductCategory } from '@/types/models';

export interface ProductFormValues {
  name: string;
  category: ProductCategory;
  unit_price: string;
  stock_qty: string;
  low_stock_threshold: string;
}

interface ProductFormProps {
  values: ProductFormValues;
  errors: Partial<Record<keyof ProductFormValues, string>>;
  onChange: (values: ProductFormValues) => void;
  categories?: ProductCategory[];
  showInitialStock?: boolean;
}

const suggestedCategories: ProductCategory[] = ['Beer', 'Wine', 'Spirits', 'Soft Drinks', 'Water', 'Other'];
const ADD_NEW_CATEGORY_VALUE = '__add_new_category__';

export function ProductForm({ values, errors, onChange, categories = [], showInitialStock = true }: ProductFormProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const customCategoryRef = useRef<HTMLInputElement>(null);

  const categoryOptions = useMemo(() => {
    const combined = [...suggestedCategories, ...categories];
    return Array.from(new Set(combined.map((item) => item.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [categories]);

  useEffect(() => {
    const categoryValue = values.category.trim();
    if (!categoryValue) {
      return;
    }

    if (categoryOptions.includes(categoryValue)) {
      setIsAddingCategory(false);
      setCustomCategory('');
      return;
    }

    setIsAddingCategory(true);
    setCustomCategory((current) => (current === categoryValue ? current : categoryValue));
  }, [categoryOptions, values.category]);

  useEffect(() => {
    if (isAddingCategory) {
      customCategoryRef.current?.focus();
    }
  }, [isAddingCategory]);

  const selectedCategoryValue = isAddingCategory || (values.category.trim() && !categoryOptions.includes(values.category.trim())) ? ADD_NEW_CATEGORY_VALUE : values.category;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
        <input
          value={values.name}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          className={`h-12 w-full rounded-xl border bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:bg-navy dark:text-slate-50 ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
          placeholder="Product name"
        />
        {errors.name ? <p className="mt-1 text-xs text-red-400">{errors.name}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
        <select
          value={selectedCategoryValue}
          onChange={(event) => {
            const nextCategory = event.target.value;
            if (nextCategory === ADD_NEW_CATEGORY_VALUE) {
              setIsAddingCategory(true);
              setCustomCategory('');
              onChange({ ...values, category: '' });
              return;
            }

            setIsAddingCategory(false);
            setCustomCategory('');
            onChange({ ...values, category: nextCategory });
          }}
          className={`h-12 w-full rounded-xl border bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:bg-navy dark:text-slate-50 ${errors.category ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
        >
          <option value="">Select category</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
          <option value={ADD_NEW_CATEGORY_VALUE}>+ Add new category</option>
        </select>
        {isAddingCategory ? (
          <input
            ref={customCategoryRef}
            value={customCategory}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCustomCategory(nextValue);
              onChange({ ...values, category: nextValue });
            }}
            placeholder="Type new category"
            className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:border-slate-700 dark:bg-navy dark:text-slate-50"
          />
        ) : null}
        {errors.category ? <p className="mt-1 text-xs text-red-400">{errors.category}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Unit Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.unit_price}
            onChange={(event) => onChange({ ...values, unit_price: event.target.value })}
            className={`h-12 w-full rounded-xl border bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:bg-navy dark:text-slate-50 ${errors.unit_price ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
          />
          {errors.unit_price ? <p className="mt-1 text-xs text-red-400">{errors.unit_price}</p> : null}
        </div>
        {showInitialStock ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Initial Stock</label>
            <input
              type="number"
              min="0"
              value={values.stock_qty}
              onChange={(event) => onChange({ ...values, stock_qty: event.target.value })}
              className={`h-12 w-full rounded-xl border bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:bg-navy dark:text-slate-50 ${errors.stock_qty ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
            />
            {errors.stock_qty ? <p className="mt-1 text-xs text-red-400">{errors.stock_qty}</p> : null}
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Low Stock Threshold</label>
          <input
            type="number"
            min="0"
            value={values.low_stock_threshold}
            onChange={(event) => onChange({ ...values, low_stock_threshold: event.target.value })}
            className={`h-12 w-full rounded-xl border bg-slate-100 px-4 text-slate-900 outline-none focus:border-amberAccent dark:bg-navy dark:text-slate-50 ${errors.low_stock_threshold ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
          />
          {errors.low_stock_threshold ? <p className="mt-1 text-xs text-red-400">{errors.low_stock_threshold}</p> : null}
        </div>
      </div>
    </div>
  );
}
