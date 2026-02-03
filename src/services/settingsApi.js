import { isApiOffline, markApiOffline, clearApiOffline } from "../lib/apiHealth";

const getEnv = (key) => {
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
      return window.__ENV__[key];
  }
  return import.meta.env[key];
};
const API_BASE_URL = getEnv("VITE_API_URL") || "/api";

export const apiCall = async (currentUser, url, method, body) => {
      if (!currentUser) return null;
      if (isApiOffline()) return null;
      try {
          const token = await currentUser.getIdToken();
          // Ensure url is tied to base if not absolute
          const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

          const res = await fetch(fullUrl, {
              method: method,
              headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': currentUser.uid,
                  'Authorization': `Bearer ${token}`
              },
              body: body ? JSON.stringify(body) : undefined
          });
          if (!res.ok) {
               console.error(`API ${method} ${fullUrl} failed:`, res.statusText);
               return null;
          }
          clearApiOffline();
          if (res.status === 204) return true;
          // Handle empty responses
          const text = await res.text();
          return text ? JSON.parse(text) : true;
      } catch (e) {
          if (e?.name === "TypeError") {
              markApiOffline(e, "settings.apiCall");
          }
          console.error("API Call Error", e);
          return null;
      }
};

export const fetchUserSettings = async (currentUser) => {
    if (!currentUser) return null;
    if (isApiOffline()) return null;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/me`, {
            headers: { 
                'X-User-ID': currentUser.uid,
                'Authorization': `Bearer ${token}` 
            }
        });
        if (res.ok) {
            clearApiOffline();
            return await res.json();
        }
    } catch (e) {
        if (e?.name === "TypeError") {
            markApiOffline(e, "settings.fetchUserSettings");
        }
        console.error("Cloud load failed", e);
    }
    return null;
};

export const fetchUserThemes = async (currentUser) => {
    if (!currentUser) return null;
    if (isApiOffline()) return null;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/themes`, {
             headers: { 
                 'X-User-ID': currentUser.uid,
                 'Authorization': `Bearer ${token}` 
             }
        });
        if (res.ok) {
            clearApiOffline();
            return await res.json();
        }
    } catch(e) {
        if (e?.name === "TypeError") {
            markApiOffline(e, "settings.fetchUserThemes");
        }
        console.error("Fetch themes failed", e);
    }
    return null;
};

export const saveUserSettings = async (currentUser, payload) => {
      if (!currentUser) return;
      if (isApiOffline()) return;
      try {
          const token = await currentUser.getIdToken();
          const res = await fetch(`${API_BASE_URL}/me`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': currentUser.uid,
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                  settings: payload,
                  displayName: currentUser.displayName,
                  avatar: currentUser.photoURL,
                  handle: currentUser.email ? currentUser.email.split('@')[0] : undefined
              })
          });
          if (res.ok) {
              clearApiOffline();
              console.log("Settings synced to cloud");
          }
      } catch(e) {
          if (e?.name === "TypeError") {
              markApiOffline(e, "settings.saveUserSettings");
          }
          console.error("Cloud save failed", e);
      }
};
