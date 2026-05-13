import type { MarkerConfig } from "../types/script";

export const isBlockLike = (config: Partial<MarkerConfig> | null | undefined): boolean => {
  if (!config || typeof config !== "object") return false;
  return Boolean(config.isBlock) ||
    config.type === "block" ||
    config.type === "dual" ||
    config.matchMode === "range";
};

export const isInlineLike = (config: Partial<MarkerConfig> | null | undefined): boolean => {
  if (!config || typeof config !== "object") return false;
  if (config.matchMode === "virtual") return false;
  return !isBlockLike(config);
};
