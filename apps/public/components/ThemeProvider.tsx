"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  migrateAppearancePreferences,
  readAppearancePreferences,
  writeAppearancePreferences,
  DEFAULT_APPEARANCE,
} from "@/lib/publicAppearancePreferences";
import type { AppearanceTheme } from "@/lib/publicAppearancePreferences";

type Theme = AppearanceTheme;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "system", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    // Run migration first (no-op if new key already present), then read new key.
    const migrated = migrateAppearancePreferences();
    const stored = readAppearancePreferences();
    const initial: Theme = stored.theme ?? migrated.theme ?? DEFAULT_APPEARANCE.theme;
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    // Merge theme into current stored preferences (preserve other fields).
    const current = { ...DEFAULT_APPEARANCE, ...readAppearancePreferences() };
    writeAppearancePreferences({ ...current, theme: next });
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
