import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeProviderContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => null,
});

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyThemeClass = (theme) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.dataset.theme = theme;
};

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'vite-ui-theme' }) {
  const [theme, setTheme] = useState(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState(
    defaultTheme === 'system' ? 'light' : defaultTheme,
  );

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey);
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      setTheme(storedTheme);
    } else {
      setTheme(defaultTheme);
    }
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    const current = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
    setResolvedTheme(current);
    applyThemeClass(current);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  useEffect(() => {
    if (theme !== 'system') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => {
      const next = event.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      applyThemeClass(next);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme],
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
