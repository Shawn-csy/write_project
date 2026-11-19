import { fetchApi } from "./client";
import type {
  BaseScriptApi,
  ScriptCreateResponse,
  ScriptMutationResponse,
  ScriptReorderItem,
  ScriptUpdatePayload,
} from "../../types/api";

export const createScript = async (title: string, type = "script", folder = "/"): Promise<string> => {
  const res = await fetchApi<ScriptCreateResponse>("/scripts", {
    method: "POST",
    body: JSON.stringify({ title, type, folder }),
  });
  return res.id;
};

export const getUserScripts = async (ownerId?: string): Promise<BaseScriptApi[]> => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi<BaseScriptApi[]>(`/scripts${qs}`);
};

interface StudioScriptsQuery {
  ownerId?: string;
  limit?: number;
  offset?: number;
}

export const getStudioScripts = async (query: string | StudioScriptsQuery = {}): Promise<BaseScriptApi[]> => {
  const resolved = typeof query === "string" ? { ownerId: query } : query;
  const params = new URLSearchParams();
  if (resolved.ownerId) params.set("ownerIdQuery", resolved.ownerId);
  if (typeof resolved.limit === "number") params.set("limit", String(resolved.limit));
  if (typeof resolved.offset === "number") params.set("offset", String(resolved.offset));
  const qs = params.toString();
  return fetchApi<BaseScriptApi[]>(`/scripts/studio-summary${qs ? `?${qs}` : ""}`);
};

export const getScript = async (scriptId: string): Promise<BaseScriptApi> => fetchApi<BaseScriptApi>(`/scripts/${scriptId}`);

export const updateScript = async (scriptId: string, updates: ScriptUpdatePayload): Promise<BaseScriptApi> => {
  return fetchApi<BaseScriptApi>(`/scripts/${scriptId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const deleteScript = async (scriptId: string): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>(`/scripts/${scriptId}`, {
    method: "DELETE",
  });
};

export const reorderScripts = async (updates: ScriptReorderItem[]): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>("/scripts/reorder", {
    method: "PUT",
    body: JSON.stringify({ items: updates }),
  });
};

export const searchScripts = async (query: string): Promise<BaseScriptApi[]> => fetchApi<BaseScriptApi[]>(`/search?q=${encodeURIComponent(query)}`);

export const addTagToScript = async (scriptId: string, tagId: string): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>(`/scripts/${scriptId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
};

export const removeTagFromScript = async (scriptId: string, tagId: string): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>(`/scripts/${scriptId}/tags/${tagId}`, {
    method: "DELETE",
  });
};

export const toggleScriptLike = async (scriptId: string): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>(`/scripts/${scriptId}/like`, { method: "POST" });
};

export const incrementScriptView = async (scriptId: string): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>(`/scripts/${scriptId}/view`, { method: "POST" });
};

export interface LikeStatusResponse {
  liked: boolean;
  likes: number;
  likeCount?: number;
}

export interface PublicScriptStatsResponse {
  contentLength: number;
  estimatedMinutes: number;
  views: number;
  likes: number;
}

export const getVisitorId = (): string => {
  const key = "visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
};

export const publicToggleScriptLike = async (scriptId: string): Promise<LikeStatusResponse> => {
  const visitorId = getVisitorId();
  return fetchApi<LikeStatusResponse>(`/public-scripts/${scriptId}/like`, {
    method: "POST",
    body: JSON.stringify({ visitorId }),
  });
};

export const getPublicScriptLikeStatus = async (scriptId: string): Promise<LikeStatusResponse> => {
  const visitorId = getVisitorId();
  return fetchApi<LikeStatusResponse>(
    `/public-scripts/${scriptId}/like-status?visitorId=${encodeURIComponent(visitorId)}`
  );
};

export const getPublicScriptStats = async (scriptId: string): Promise<PublicScriptStatsResponse> => {
  return fetchApi<PublicScriptStatsResponse>(`/public-scripts/${scriptId}/stats`);
};

export const transferScriptOwnership = async (scriptId: string, targetUserId: string): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>(`/scripts/${scriptId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId }),
  });
};
