import { API_BASE_URL, fetchApi, getAuthHeaders } from "./client";

export const getUserProfile = async () => fetchApi("/me", { cacheTtlMs: 10000 });

export const updateUserProfile = async (updates) => {
  return fetchApi("/me", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const exportScripts = async () => {
  const url = `${API_BASE_URL}/export/all`;
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, { headers: authHeaders });
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
};
