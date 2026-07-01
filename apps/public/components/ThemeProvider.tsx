"use client";

import { useCallback, useEffect } from "react";
import { PublicAppearanceProvider, usePublicAppearance } from "@/components/PublicAppearanceContext";
import type { AppearanceTheme } from "@/lib/publicAppearancePreferences";

type Theme = AppearanceTheme;

// useTheme — thin proxy over usePublicAppearance for backwards compatibility.
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const { prefs, setTheme } = usePublicAppearance();
  return { theme: prefs.theme, setTheme };
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}

function SystemThemeListener({ theme }: { theme: Theme }) {
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  return null;
}

function ThemeApplier() {
  const { prefs } = usePublicAppearance();
  return <SystemThemeListener theme={prefs.theme} />;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const handleThemeChange = useCallback((theme: Theme) => {
    applyTheme(theme);
  }, []);

  return (
    <PublicAppearanceProvider onThemeChange={handleThemeChange}>
      <ThemeApplier />
      {children}
    </PublicAppearanceProvider>
  );
}
