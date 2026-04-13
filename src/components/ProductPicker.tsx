import clsx from 'clsx';
import { Search } from 'lucide-react';
import type { ProductCategory, ProductRecord } from '@/types/models';
import { Button } from './Button';
import { Card } from './Card';
import { formatStockDisplay } from '@/utils/stockDisplay';
import { usePackagings } from '@/hooks/usePackagings';

interface ProductPickerProps {
  search: string;
  category: 'All' | ProductCategory;
  products: ProductRecord[];
  selectedId?: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: 'All' | ProductCategory) => void;
  onSelect: (product: ProductRecord) => void;
}

export function ProductPicker({
  search,
  category,
  products,
  selectedId,
  onSearchChange,
  onCategoryChange,
  onSelect
}: ProductPickerProps) {
  const { packagings } = usePackagings();
  const categories: Array<'All' | ProductCategory> = ['All', ...Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b))];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = category === 'All' || product.category === category;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products"
          className="h-12 w-full rounded-xl border border-slate-300 bg-slate-100 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-amberAccent dark:border-slate-700 dark:bg-navy dark:text-slate-50"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <Button
            key={item}
            variant={category === item ? 'primary' : 'secondary'}
            className="whitespace-nowrap px-4"
            onClick={() => onCategoryChange(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredProducts.map((product) => {
          const selected = selectedId === product.id;
          return (
            <Card
              key={product.id}
              className={clsx(
                'cursor-pointer border-2 transition active:scale-[0.99]',
                  selected ? 'border-amberAccent' : 'border-slate-200 dark:border-transparent'
              )}
              onClick={() => onSelect(product)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">{product.name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amberAccent">{product.unit_price.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Stock: {formatStockDisplay(product, packagings)}</p>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredProducts.length === 0 ? (
          <Card className="text-center text-sm text-slate-500 dark:text-slate-400">No matching products found.</Card>
        ) : null}
      </div>
    </div>
  );
}
