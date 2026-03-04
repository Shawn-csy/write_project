import React from "react";
import { getPublicThemes } from "../lib/api/public";
import { normalizeThemeConfigs } from "../lib/markerThemeCodec";

export function usePublicThemes({ t, errorKey = "publicThemeDialog.loadFailed" } = {}) {
  const [themes, setThemes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPublicThemes();
      const normalized = Array.isArray(data)
        ? data.map((theme) => ({
            ...theme,
            configs: normalizeThemeConfigs(theme.configs),
          }))
        : [];
      setThemes(normalized);
      return normalized;
    } catch (e) {
      setThemes([]);
      setError(String(e?.message || t?.(errorKey, "載入失敗")));
      return [];
    } finally {
      setLoading(false);
    }
  }, [errorKey, t]);

  const removeThemeById = React.useCallback((id) => {
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
