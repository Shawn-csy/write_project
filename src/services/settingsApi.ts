import { fetchApi, API_BASE_URL } from "../lib/api/client";
import { isApiOffline } from "../lib/apiHealth";

interface CurrentUserLike {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  getIdToken?: () => Promise<string>;
}

// Generic authenticated API call — thin wrapper over fetchApi for callers
// that pass a currentUser explicitly rather than relying on auth.currentUser.
export const apiCall = async (
  currentUser: CurrentUserLike | null | undefined,
  url: string,
  method: string,
  body?: unknown
): Promise<unknown> => {
  if (!currentUser) return null;
  if (isApiOffline()) return null;
  const endpoint = url.startsWith("http")
    ? url.replace(API_BASE_URL, "")
    : url.startsWith("/") ? url : `/${url}`;
  try {
    return await fetchApi(endpoint, {
      method,
      noCache: true,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    console.error("API Call Error", e);
    return null;
  }
};

// Cached read for user settings.
export const fetchUserSettings = async (currentUser: CurrentUserLike | null | undefined) => {
  if (!currentUser) return null;
  if (isApiOffline()) return null;
  try {
    return await fetchApi("/me");
  } catch (e) {
    console.error("Cloud load failed", e);
    return null;
  }
};

// Cached read for user themes.
export const fetchUserThemes = async (currentUser: CurrentUserLike | null | undefined) => {
  if (!currentUser) return null;
  if (isApiOffline()) return null;
  try {
    return await fetchApi("/themes");
  } catch (e) {
    console.error("Fetch themes failed", e);
    return null;
  }
};

// PUT /me — bypasses cache (noCache: true handled by fetchApi on non-GET).
export const saveUserSettings = async (currentUser: CurrentUserLike | null | undefined, payload: unknown) => {
  if (!currentUser) return;
  if (isApiOffline()) return;
  try {
    await fetchApi("/me", {
      method: "PUT",
      noCache: true,
      body: JSON.stringify({
        settings: payload,
        displayName: currentUser.displayName,
        avatar: currentUser.photoURL,
        handle: currentUser.email?.split("@")[0],
      }),
    });
  } catch (e) {
    console.error("Cloud save failed", e);
  }
};
