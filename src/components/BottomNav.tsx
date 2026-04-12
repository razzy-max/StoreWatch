import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface BottomNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export function BottomNav({ items }: { items: BottomNavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700 bg-slatePanel/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-2xl gap-2 px-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition',
                  isActive ? 'bg-amberAccent text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
