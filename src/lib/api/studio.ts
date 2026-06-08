import { fetchApi } from "./client";
import type { BaseScriptApi, StudioBootstrapResponse, StudioScriptsResponse } from "../../types/api";

export interface StudioScriptsQuery {
  limit?: number;
  offset?: number;
  status?: string;
  q?: string;
  sort?: string;
  includeCounts?: boolean;
}

const toQueryString = (query: StudioScriptsQuery): string => {
  const params = new URLSearchParams();
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.offset === "number") params.set("offset", String(query.offset));
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.sort) params.set("sort", query.sort);
  if (typeof query.includeCounts === "boolean") params.set("includeCounts", query.includeCounts ? "true" : "false");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const getStudioBootstrap = async (limit = 24): Promise<StudioBootstrapResponse> => {
  return fetchApi<StudioBootstrapResponse>(`/studio/bootstrap?limit=${encodeURIComponent(String(limit))}`);
};

export const getStudioScriptsPage = async (query: StudioScriptsQuery = {}): Promise<StudioScriptsResponse> => {
  return fetchApi<StudioScriptsResponse>(`/studio/scripts${toQueryString(query)}`);
};

export const getStudioPublishContext = async (scriptId: string): Promise<BaseScriptApi> => {
  return fetchApi<BaseScriptApi>(`/studio/scripts/${encodeURIComponent(scriptId)}/publish-context`);
};
