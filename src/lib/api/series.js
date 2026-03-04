import { fetchApi } from "./client";

export const getSeries = async () => fetchApi("/series", { cache: "no-store" });

export const createSeries = async (payload) => {
  return fetchApi("/series", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateSeries = async (seriesId, payload) => {
  return fetchApi(`/series/${seriesId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteSeries = async (seriesId) => {
  return fetchApi(`/series/${seriesId}`, {
    method: "DELETE",
  });
};
