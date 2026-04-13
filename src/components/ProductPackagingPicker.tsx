import clsx from 'clsx';
import { Card } from './Card';
import type { ProductPackagingRecord } from '@/types/models';

interface ProductPackagingPickerProps {
  packagingOptions: ProductPackagingRecord[];
  selectedPackagingId: string | null;
  onSelect: (packaging: ProductPackagingRecord) => void;
}

export function ProductPackagingPicker({ packagingOptions, selectedPackagingId, onSelect }: ProductPackagingPickerProps) {
  if (packagingOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 dark:text-slate-400">Packaging</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {packagingOptions.map((packaging) => {
          const selected = selectedPackagingId === packaging.id;
          return (
            <button key={packaging.id} type="button" onClick={() => onSelect(packaging)} className="text-left">
              <Card
                className={clsx(
                  'border-2 transition active:scale-[0.99]',
                  selected
                    ? 'border-amberAccent bg-amber-50 ring-2 ring-amber-200/80 dark:bg-amberAccent/10 dark:ring-amber-500/30'
                    : 'border-slate-200 dark:border-transparent'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{packaging.label}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{packaging.units_per_package} unit(s) per {packaging.label.toLowerCase()}</p>
                    {selected ? <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Selected</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amberAccent">
                      {packaging.selling_price_per_package.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                    </p>
                    {packaging.is_default ? <p className="text-xs text-slate-500 dark:text-slate-400">Default</p> : null}
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
