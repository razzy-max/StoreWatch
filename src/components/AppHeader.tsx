import { Menu, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';
import { useTheme } from './ThemeProvider';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onLogout: () => void;
}

export function AppHeader({ title, subtitle, onLogout }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor }
  ];

  return (
    <div className="relative mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50 dark:text-slate-50">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-400 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="relative">
        <Button
          variant="ghost"
          className="min-h-12 min-w-12 rounded-full border border-slate-700 bg-slate-800/70 p-3 dark:border-slate-700 dark:bg-slate-800/70"
          onClick={() => setOpen((value) => !value)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {open ? (
          <div className="absolute right-0 top-14 z-30 w-48 overflow-hidden rounded-2xl border border-slate-700 bg-slatePanel shadow-soft dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-700 px-4 py-2 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-400">Theme</p>
              <div className="mt-2 space-y-1">
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                      theme === value
                        ? 'bg-slate-700 text-slate-50 dark:bg-slate-700 dark:text-slate-50'
                        : 'text-slate-300 hover:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => {
                      setTheme(value);
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-100 hover:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
