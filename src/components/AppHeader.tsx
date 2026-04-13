import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';
import { useTheme } from '@/context/ThemeContext';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onLogout: () => void;
}

export function AppHeader({ title, subtitle, onLogout }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="relative flex items-center gap-2">
        <Button
          variant="secondary"
          className="min-h-12 min-w-12 rounded-full border border-slate-300 bg-white p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="relative block h-5 w-5">
            <Sun
              className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${
                theme === 'dark' ? 'rotate-0 opacity-100' : '-rotate-45 opacity-0'
              }`}
            />
            <Moon
              className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${
                theme === 'light' ? 'rotate-0 opacity-100' : 'rotate-45 opacity-0'
              }`}
            />
          </span>
        </Button>
        <Button
          variant="ghost"
          className="min-h-12 min-w-12 rounded-full border border-slate-300 bg-white p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
          onClick={() => setOpen((value) => !value)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {open ? (
          <div className="absolute right-0 top-14 z-30 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-800">
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
