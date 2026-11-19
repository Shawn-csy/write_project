import { fetchApi } from "./client";
import type { ScriptMutationResponse, SeriesLike, SeriesPayload, SeriesReorderItem } from "../../types/api";

export const getSeries = async (): Promise<SeriesLike[]> => fetchApi("/series", { cache: "no-store" }) as Promise<SeriesLike[]>;

export const createSeries = async (payload: SeriesPayload): Promise<SeriesLike> => {
  return fetchApi("/series", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<SeriesLike>;
};

export const updateSeries = async (seriesId: string, payload: SeriesPayload): Promise<SeriesLike> => {
  return fetchApi(`/series/${seriesId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }) as Promise<SeriesLike>;
};

export const deleteSeries = async (seriesId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/series/${seriesId}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const reorderSeriesScripts = async (
  seriesId: string,
  items: SeriesReorderItem[]
): Promise<ScriptMutationResponse> => {
  return fetchApi(`/series/${seriesId}/scripts/reorder`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  }) as Promise<ScriptMutationResponse>;
};
