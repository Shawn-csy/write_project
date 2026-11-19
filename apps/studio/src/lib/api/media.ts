import { API_BASE_URL, fetchApi, getAuthHeaders } from "./client";

export const uploadMediaObject = async (file: File, purpose = "generic") => {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    headers: authHeaders as HeadersInit,
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

export interface MediaLibraryOrganization {
  folders: Array<{ id: string; name: string }>;
  assignments: Record<string, string>;
}

export const getMediaOrganization = async () => {
  return fetchApi("/media/organization", { cache: "no-store" }) as Promise<MediaLibraryOrganization>;
};

export const saveMediaOrganization = async (organization: MediaLibraryOrganization) => {
  return fetchApi("/media/organization", {
    method: "PUT",
    body: JSON.stringify(organization),
  }) as Promise<MediaLibraryOrganization>;
};

export const deleteMediaObject = async (url: string) => {
  return fetchApi("/media/items", {
    method: "DELETE",
    body: JSON.stringify({ url }),
  });
};
