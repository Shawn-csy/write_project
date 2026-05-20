import type { MarkerConfig } from "../types/script";

export const isBlockLike = (config: Partial<MarkerConfig> | null | undefined): boolean => {
  if (!config || typeof config !== "object") return false;
  return Boolean(config.isBlock) ||
    config.type === "block" ||
    config.matchMode === "range";
};

export const isInlineLike = (config: Partial<MarkerConfig> | null | undefined): boolean => {
  if (!config || typeof config !== "object") return false;
  if (config.matchMode === "virtual") return false;
  return !isBlockLike(config);
};

/**
 * Normalise legacy marker type values.
 * - 'dual' was removed; treat as 'inline' (it was never block-like).
 * Call this when reading marker configs from persistent storage.
 */
export const normalizeLegacyMarkerType = (config: MarkerConfig): MarkerConfig => {
  if (config.type === 'dual') {
    return { ...config, type: 'inline' };
  }
  return config;
};
