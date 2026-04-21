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
                    ? 'border-amberAccent bg-amberAccent/20 shadow-md ring-2 ring-amber-300/70 dark:bg-amberAccent/20 dark:ring-amber-400/40'
                    : 'border-slate-200 dark:border-transparent'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={clsx('text-base font-semibold', selected ? 'text-slate-950 dark:text-slate-50' : 'text-slate-900 dark:text-slate-50')}>
                      {packaging.label}
                    </p>
                    <p className={clsx('mt-1 text-sm', selected ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400')}>
                      {packaging.units_per_package} unit(s) per {packaging.label.toLowerCase()}
                    </p>
                    {selected ? <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-50">Selected</p> : null}
                  </div>
                  <div className="text-right">
                    <p className={clsx('text-sm font-semibold', selected ? 'text-slate-950 dark:text-slate-50' : 'text-amberAccent')}>
                      {packaging.selling_price_per_package.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                    </p>
                    {packaging.is_default ? <p className={clsx('text-xs', selected ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400')}>Default</p> : null}
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
