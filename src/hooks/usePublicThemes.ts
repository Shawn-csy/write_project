import React from "react";
import { getPublicThemes } from "../lib/api/public";
import { normalizeThemeConfigs } from "../lib/markerThemeCodec";

interface PublicTheme {
  id: string;
  name?: string;
  configs: unknown[];
  [key: string]: unknown;
}

interface UsePublicThemesOptions {
  t?: (key: string, fallback?: string) => string;
  errorKey?: string;
}

interface UsePublicThemesResult {
  themes: PublicTheme[];
  loading: boolean;
  error: string;
  refresh: () => Promise<PublicTheme[]>;
  removeThemeById: (id: string) => void;
}

export function usePublicThemes({ t, errorKey = "publicThemeDialog.loadFailed" }: UsePublicThemesOptions = {}): UsePublicThemesResult {
  const [themes, setThemes] = React.useState<PublicTheme[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPublicThemes() as PublicTheme[] | null;
      const normalized = Array.isArray(data)
        ? data.map((theme) => ({
            ...theme,
            configs: normalizeThemeConfigs(theme.configs),
          }))
        : [];
      setThemes(normalized);
      return normalized;
    } catch (e: unknown) {
      setThemes([]);
      setError(String(e instanceof Error ? e.message : t?.(errorKey, "載入失敗")));
      return [];
    } finally {
      setLoading(false);
    }
  }, [errorKey, t]);

  const removeThemeById = React.useCallback((id: string) => {
    setThemes((prev) => prev.filter((theme) => theme.id !== id));
  }, []);

  return {
    themes,
    loading,
    error,
    refresh,
    removeThemeById,
  };
}
