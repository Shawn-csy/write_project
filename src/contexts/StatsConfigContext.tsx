/**
 * StatsConfigContext — very-low-frequency state.
 * Changes only when user edits stats configuration in settings.
 */
import React, { createContext, useContext } from "react";

interface StatsKeywordRule {
  factor: number;
  keywords: string;
}

export interface StatsConfig {
  wordCountDivisor: number;
  excludeNestedDuration: boolean;
  excludePunctuation: boolean;
  customKeywords: StatsKeywordRule[];
}

export interface StatsConfigContextValue {
  statsConfig: StatsConfig;
  setStatsConfig: (value: StatsConfig) => void;
}

const StatsConfigContext = createContext<StatsConfigContextValue | undefined>(undefined);

export function useStatsConfig(): StatsConfigContextValue {
  const ctx = useContext(StatsConfigContext);
  if (!ctx) throw new Error("useStatsConfig must be used within SettingsProvider");
  return ctx;
}

export const StatsConfigProvider = StatsConfigContext.Provider;
