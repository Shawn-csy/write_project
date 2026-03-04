import { fetchApi } from "./client";

export const createScript = async (title, type = "script", folder = "/") => {
  const res = await fetchApi("/scripts", {
    method: "POST",
    body: JSON.stringify({ title, type, folder }),
  });
  return res.id;
};

export const getUserScripts = async (ownerId) => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi(`/scripts${qs}`);
};

export const getScript = async (scriptId) => fetchApi(`/scripts/${scriptId}`);

export const updateScript = async (scriptId, updates) => {
  return fetchApi(`/scripts/${scriptId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const deleteScript = async (scriptId) => {
  return fetchApi(`/scripts/${scriptId}`, {
    method: "DELETE",
  });
};

export const reorderScripts = async (updates) => {
  return fetchApi("/scripts/reorder", {
    method: "PUT",
    body: JSON.stringify({ items: updates }),
  });
};

export const searchScripts = async (query) => fetchApi(`/search?q=${encodeURIComponent(query)}`);

export const addTagToScript = async (scriptId, tagId) => {
  return fetchApi(`/scripts/${scriptId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
};

export const removeTagFromScript = async (scriptId, tagId) => {
  return fetchApi(`/scripts/${scriptId}/tags/${tagId}`, {
    method: "DELETE",
  });
};

export const toggleScriptLike = async (scriptId) => {
  return fetchApi(`/scripts/${scriptId}/like`, { method: "POST" });
};

export const incrementScriptView = async (scriptId) => {
  return fetchApi(`/scripts/${scriptId}/view`, { method: "POST" });
};

export const transferScriptOwnership = async (scriptId, targetUserId) => {
  return fetchApi(`/scripts/${scriptId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId }),
  });
};
