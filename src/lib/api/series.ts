import { fetchApi } from "./client";
import type { ScriptMutationResponse, SeriesLike, SeriesPayload } from "../../types/api";

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
