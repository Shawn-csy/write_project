import { fetchApi } from "./client";
import type {
  BaseScriptApi,
  ScriptCreateResponse,
  ScriptMutationResponse,
  ScriptReorderItem,
  ScriptUpdatePayload,
} from "../../types/api";

export const createScript = async (title: string, type = "script", folder = "/"): Promise<string> => {
  const res = await fetchApi("/scripts", {
    method: "POST",
    body: JSON.stringify({ title, type, folder }),
  }) as ScriptCreateResponse;
  return res.id;
};

export const getUserScripts = async (ownerId?: string): Promise<BaseScriptApi[]> => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi(`/scripts${qs}`) as Promise<BaseScriptApi[]>;
};

export const getScript = async (scriptId: string): Promise<BaseScriptApi> => fetchApi(`/scripts/${scriptId}`) as Promise<BaseScriptApi>;

export const updateScript = async (scriptId: string, updates: ScriptUpdatePayload): Promise<BaseScriptApi> => {
  return fetchApi(`/scripts/${scriptId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  }) as Promise<BaseScriptApi>;
};

export const deleteScript = async (scriptId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/scripts/${scriptId}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const reorderScripts = async (updates: ScriptReorderItem[]): Promise<ScriptMutationResponse> => {
  return fetchApi("/scripts/reorder", {
    method: "PUT",
    body: JSON.stringify({ items: updates }),
  }) as Promise<ScriptMutationResponse>;
};

export const searchScripts = async (query: string): Promise<BaseScriptApi[]> => fetchApi(`/search?q=${encodeURIComponent(query)}`) as Promise<BaseScriptApi[]>;

export const addTagToScript = async (scriptId: string, tagId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/scripts/${scriptId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  }) as Promise<ScriptMutationResponse>;
};

export const removeTagFromScript = async (scriptId: string, tagId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/scripts/${scriptId}/tags/${tagId}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const toggleScriptLike = async (scriptId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/scripts/${scriptId}/like`, { method: "POST" }) as Promise<ScriptMutationResponse>;
};

export const incrementScriptView = async (scriptId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/scripts/${scriptId}/view`, { method: "POST" }) as Promise<ScriptMutationResponse>;
};

export const transferScriptOwnership = async (scriptId: string, targetUserId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/scripts/${scriptId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId }),
  }) as Promise<ScriptMutationResponse>;
};
