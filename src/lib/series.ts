import { customMetadataEntriesToMeta } from "./customMetadata";
import type { BaseScriptApi } from "../types/api";

export const normalizeSeriesName = (value: unknown): string => String(value || "").trim();

export const parseSeriesOrder = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
};

export const getSeriesInfoFromScript = (script: Partial<BaseScriptApi> | null | undefined): { seriesName: string; seriesOrder: number | null } => {
  try {
    const meta = customMetadataEntriesToMeta(script?.customMetadata || []);
    const seriesName = normalizeSeriesName(script?.series?.name || meta?.series || meta?.seriesname);
    const seriesOrder = parseSeriesOrder(script?.seriesOrder ?? meta?.seriesorder ?? meta?.episode);
    return { seriesName, seriesOrder };
  } catch {
    return { seriesName: "", seriesOrder: null };
  }
};

export const getSeriesInfoFromContent = () => ({ seriesName: "", seriesOrder: null });
