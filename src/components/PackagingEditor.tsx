import { Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';
import type { ProductPackagingRecord } from '@/types/models';

export interface PackagingFormValues {
  label: string;
  units_per_package: string;
  selling_price_per_package: string;
}

interface PackagingEditorProps {
  packagings: ProductPackagingRecord[];
  onAdd: (packaging: PackagingFormValues) => void;
  onRemove: (id: string) => void;
}

export function PackagingEditor({ packagings, onAdd, onRemove }: PackagingEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPackaging, setNewPackaging] = useState<PackagingFormValues>({
    label: '',
    units_per_package: '1',
    selling_price_per_package: ''
  });

  const handleAddClick = () => {
    if (newPackaging.label.trim() && newPackaging.selling_price_per_package.trim()) {
      onAdd(newPackaging);
      setNewPackaging({ label: '', units_per_package: '1', selling_price_per_package: '' });
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Pricing Tiers</label>
      </div>

      <div className="space-y-2">
        {packagings.map((pkg) => (
          <div key={pkg.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{pkg.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pkg.units_per_package} units @ ${Number(pkg.selling_price_per_package).toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(pkg.id)}
              className="rounded-lg p-2 hover:bg-red-500/20 dark:hover:bg-red-500/20"
              aria-label="Remove packaging"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Label (e.g., Single, Crate, Case)</label>
            <input
              type="text"
              value={newPackaging.label}
              onChange={(e) => setNewPackaging({ ...newPackaging, label: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-900 outline-none focus:border-amberAccent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="e.g., Single, Crate"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Units Per Package</label>
              <input
                type="number"
                min="1"
                value={newPackaging.units_per_package}
                onChange={(e) => setNewPackaging({ ...newPackaging, units_per_package: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-900 outline-none focus:border-amberAccent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPackaging.selling_price_per_package}
                onChange={(e) => setNewPackaging({ ...newPackaging, selling_price_per_package: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-900 outline-none focus:border-amberAccent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setIsAdding(false);
                setNewPackaging({ label: '', units_per_package: '1', selling_price_per_package: '' });
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddClick}>
              Add Tier
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => setIsAdding(true)}
          className="mt-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Pricing Tier
        </Button>
      )}
    </div>
  );
}
