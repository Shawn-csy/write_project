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

export const transferScriptOwnership = async (scriptId: string, targetUserId: string): Promise<ScriptMutationResponse> => {
  return fetchApi<ScriptMutationResponse>(`/scripts/${scriptId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId }),
  });
};
