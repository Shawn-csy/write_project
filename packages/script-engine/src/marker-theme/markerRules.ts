/** Ported from src/lib/markerRules.ts */

import type { MarkerConfig } from "../document/astTypes";

export const isBlockLike = (config: Partial<MarkerConfig> | null | undefined): boolean => {
  if (!config || typeof config !== "object") return false;
  return (
    Boolean(config.isBlock) ||
    config.type === "block" ||
    config.matchMode === "range"
  );
};

export const isInlineLike = (config: Partial<MarkerConfig> | null | undefined): boolean => {
  if (!config || typeof config !== "object") return false;
  if (config.matchMode === "virtual") return false;
  return !isBlockLike(config);
};

export const normalizeLegacyMarkerType = (config: MarkerConfig): MarkerConfig => {
  if (config.type === "dual") {
    return { ...config, type: "inline" };
  }
  return config;
};
