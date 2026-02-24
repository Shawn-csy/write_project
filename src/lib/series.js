import { extractMetadataWithRaw } from "./metadataParser";

export const normalizeSeriesName = (value) => String(value || "").trim();

export const parseSeriesOrder = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
};

export const getSeriesInfoFromContent = (content) => {
  try {
    const { meta } = extractMetadataWithRaw(content || "");
    const seriesName = normalizeSeriesName(meta?.series || meta?.seriesname);
    const seriesOrder = parseSeriesOrder(meta?.seriesorder ?? meta?.episode);
    return { seriesName, seriesOrder };
  } catch {
    return { seriesName: "", seriesOrder: null };
  }
};
