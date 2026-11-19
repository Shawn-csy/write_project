import { API_BASE_URL, fetchApi, getAuthHeaders } from "./client";

export interface UserProfileApi {
  displayName?: string;
  email?: string;
  avatar?: string;
  handle?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

export const getUserProfile = async (): Promise<UserProfileApi | null> => fetchApi<UserProfileApi | null>("/me");

export const updateUserProfile = async (updates: Partial<UserProfileApi>): Promise<UserProfileApi | null> => {
  return fetchApi<UserProfileApi | null>("/me", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const exportScripts = async () => {
  const url = `${API_BASE_URL}/export/all`;
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, { headers: authHeaders as HeadersInit });
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
};
