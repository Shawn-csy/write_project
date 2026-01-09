import { auth } from "./firebase";

// Base URL for the API
// In production/tunnel, this should be an env variable.
// Defaulting to localhost:3001 for now.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:1091/api";

async function fetchApi(endpoint, options = {}) {
  if (!auth.currentUser) throw new Error("User must be logged in");

  const userId = auth.currentUser.uid;
  
  const headers = {
    "Content-Type": "application/json",
    "X-User-ID": userId, // Simple Auth
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Create a new script
export const createScript = async (title = "Untitled Script") => {
  const data = await fetchApi("/scripts", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return data.id;
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
