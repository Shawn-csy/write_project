import { auth } from "./firebase";

// Basic DB Layer wrapping API calls
const API_BASE_URL = "http://localhost:1091/api"; 

async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const userId = "test-user"; // Simplified auth for now

  const headers = {
    "Content-Type": "application/json",
    "X-User-ID": userId, // Simple Auth
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}
// ... (rest of the file) ...
// Below usage needs no change if I rename the const back to API_BASE_URL
// Or I can update usage. Renaming const is safer since fetchPublic might use it too.

// Check fetchPublic usage:
// const fetchPublic = async (endpoint) => {
//   const response = await fetch(`${API_BASE_URL}${endpoint}`);
// ... }
// So renaming const back to API_BASE_URL is the correct fix.

// Create a new script
export const createScript = async (title, type = 'script', folder = '/') => {
  const res = await fetchApi("/scripts", {
    method: "POST",
    body: JSON.stringify({ title, type, folder }),
  });
  return res.id;
};

// Get all scripts for the current user
export const getUserScripts = async () => {
  return fetchApi("/scripts");
};

// Get a single script by ID
export const getScript = async (scriptId) => {
  return fetchApi(`/scripts/${scriptId}`);
};

// Update script content
export const updateScript = async (scriptId, updates) => {
  return fetchApi(`/scripts/${scriptId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

// Delete a script
export const deleteScript = async (scriptId) => {
  return fetchApi(`/scripts/${scriptId}`, {
    method: "DELETE",
  });
};

// Reorder Scripts
export const reorderScripts = async (updates) => {
  return fetchApi("/scripts/reorder", {
    method: "PUT",
    body: JSON.stringify({ updates }),
  });
};

// --- Search API ---
export const searchScripts = async (query) => {
    return fetchApi(`/search?q=${encodeURIComponent(query)}`);
};

// --- Tags API ---
export const getTags = async () => {
    return fetchApi("/tags");
};

export const createTag = async (name, color) => {
    return fetchApi("/tags", {
        method: "POST",
        body: JSON.stringify({ name, color })
    });
};

export const deleteTag = async (tagId) => {
    return fetchApi(`/tags/${tagId}`, {
        method: "DELETE"
    });
};

export const addTagToScript = async (scriptId, tagId) => {
    return fetchApi(`/scripts/${scriptId}/tags`, {
        method: "POST",
        body: JSON.stringify({ tagId })
    });
};

export const removeTagFromScript = async (scriptId, tagId) => {
    return fetchApi(`/scripts/${scriptId}/tags/${tagId}`, {
        method: "DELETE"
    });
};

// --- User/Settings API ---
export const getUserProfile = async () => {
    return fetchApi("/me");
};

export const updateUserProfile = async (updates) => {
    // updates = { handle, displayName, bio, settings... }
    return fetchApi("/me", {
        method: "PUT",
        body: JSON.stringify(updates)
    });
};

// --- Public API ---

const fetchPublic = async (endpoint) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
     throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

export const getPublicScripts = async (ownerId, folder) => {
    let url = "/public-scripts";
    const params = new URLSearchParams();
    if (ownerId) params.append("ownerId", ownerId);
    if (folder) params.append("folder", folder);
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    return fetchPublic(url);
};

export const getPublicScript = async (id) => {
    return fetchPublic(`/public-scripts/${id}`);
};
