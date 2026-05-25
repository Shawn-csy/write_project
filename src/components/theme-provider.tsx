import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeContextValue {
  theme: string;
  resolvedTheme: string;
  setTheme: (theme: string) => void;
}

const ThemeProviderContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => undefined,
});

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyThemeClass = (theme: string) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.dataset.theme = theme;
};

const readStoredTheme = (storageKey: string, defaultTheme: string): string => {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // localStorage unavailable
  }
  return defaultTheme;
};

const resolveTheme = (theme: string): string =>
  theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'vite-ui-theme' }: { children: React.ReactNode; defaultTheme?: string; storageKey?: string }) {
  const [theme, setThemeState] = useState<string>(() => readStoredTheme(storageKey, defaultTheme));

  const [resolvedTheme, setResolvedTheme] = useState<string>(() => {
    const initial = readStoredTheme(storageKey, defaultTheme);
    const resolved = resolveTheme(initial);
    // Synchronously apply on first paint — eliminates FOUC
    if (typeof document !== 'undefined') applyThemeClass(resolved);
    return resolved;
  });

  const setTheme = useCallback((next: string) => {
    setThemeState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // localStorage unavailable
    }
    const resolved = resolveTheme(next);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, [storageKey]);

  // Keep DOM in sync when system colour scheme changes (only relevant in 'system' mode)
  useEffect(() => {
    if (theme !== 'system') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      const next = event.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      applyThemeClass(next);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
