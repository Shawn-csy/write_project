import { API_BASE_URL, fetchApi, getAuthHeaders } from "./client";

export const uploadMediaObject = async (file, purpose = "generic") => {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      detail?.trim()
        ? `API Error ${response.status}: ${detail.trim()}`
        : `API Error ${response.status}: ${response.statusText || "Upload failed"}`
    );
  }

  return response.json();
};

export const getMediaObjects = async () => {
  return fetchApi("/media/items", { cache: "no-store" });
};

export const deleteMediaObject = async (url) => {
  return fetchApi("/media/items", {
    method: "DELETE",
    body: JSON.stringify({ url }),
  });
};
