import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'storewatch-theme';
const DARK_THEME_COLOR = '#0F172A';
const LIGHT_THEME_COLOR = '#F8FAFC';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ensureThemeMetaTag() {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  return meta;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove('dark');
  if (theme === 'dark') {
    html.classList.add('dark');
  }
  html.setAttribute('data-theme', theme);
  html.style.colorScheme = theme;

  document.body.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);

    window.localStorage.setItem(STORAGE_KEY, theme);

    const themeMeta = ensureThemeMetaTag();
    themeMeta.content = theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((current) => {
          const nextTheme = current === 'dark' ? 'light' : 'dark';
          applyTheme(nextTheme);
          window.localStorage.setItem(STORAGE_KEY, nextTheme);
          return nextTheme;
        });
      }
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
