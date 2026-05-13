import { customMetadataEntriesToMeta } from "./customMetadata";

export const normalizeSeriesName = (value) => String(value || "").trim();

export const parseSeriesOrder = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
};

export const getSeriesInfoFromScript = (script) => {
  try {
    const meta = customMetadataEntriesToMeta(script?.customMetadata || []);
    const seriesName = normalizeSeriesName(meta?.series || meta?.seriesname);
    const seriesOrder = parseSeriesOrder(script?.seriesOrder ?? meta?.seriesorder ?? meta?.episode);
    return { seriesName, seriesOrder };
  } catch {
    return { seriesName: "", seriesOrder: null };
  }
};

export const getSeriesInfoFromContent = () => ({ seriesName: "", seriesOrder: null });
