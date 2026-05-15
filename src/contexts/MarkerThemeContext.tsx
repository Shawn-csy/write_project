/**
 * MarkerThemeContext — medium-frequency state.
 * Changes when user switches/edits marker themes.
 * Isolated from appearance and visibility contexts.
 */
import React, { createContext, useContext } from "react";
import type { useMarkerThemes } from "../hooks/useMarkerThemes";

export type MarkerThemeContextValue = ReturnType<typeof useMarkerThemes>;

const MarkerThemeContext = createContext<MarkerThemeContextValue | undefined>(undefined);

export function useMarkerThemeContext(): MarkerThemeContextValue {
  const ctx = useContext(MarkerThemeContext);
  if (!ctx) throw new Error("useMarkerThemeContext must be used within SettingsProvider");
  return ctx;
}

export const MarkerThemeProvider = MarkerThemeContext.Provider;
