import { auth } from "./firebase";
import { isApiOffline, markApiOffline, clearApiOffline } from "./apiHealth";

// Basic DB Layer wrapping API calls
const getEnv = (key) => {
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
      return window.__ENV__[key];
  }
  return import.meta.env[key];
};
const API_BASE_URL = getEnv("VITE_API_URL") || "/api"; 
const localAuthEnabled = ["1", "true", "yes"].includes(
  String(getEnv("VITE_LOCAL_AUTH")).toLowerCase()
);
const localAuthUserId = getEnv("VITE_LOCAL_AUTH_UID") || "local-test-user";

async function getAuthHeaders() {
  if (localAuthEnabled) {
    return { "X-User-ID": localAuthUserId };
  }
  if (auth.currentUser?.getIdToken) {
    const token = await auth.currentUser.getIdToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function fetchApi(endpoint, options = {}, retries = 3, backoff = 500) {
  if (isApiOffline()) {
    throw new Error("API offline (cooldown)");
  }
  const url = `${API_BASE_URL}${endpoint}`;

  const authHeaders = await getAuthHeaders();
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
       // If 5xx error, maybe retry? For now throw.
       throw new Error(`API Error: ${response.statusText}`);
    }

    clearApiOffline();
    return response.json();
  } catch (err) {
    if (err?.name === "TypeError") {
      markApiOffline(err, "db.fetchApi");
      throw err;
    }
    if (retries > 0) {
      console.warn(`Fetch failed, retrying in ${backoff}ms... (${retries} left)`, err);
      await new Promise(r => setTimeout(r, backoff));
      return fetchApi(endpoint, options, retries - 1, backoff * 1.5);
    }
    throw err;
  }
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
export const getUserScripts = async (ownerId) => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi(`/scripts${qs}`);
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
    body: JSON.stringify({ items: updates }),
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

export const exportScripts = async () => {
    const url = `${API_BASE_URL}/export/all`;
    const authHeaders = await getAuthHeaders();
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
};

// --- Public API ---

const fetchPublic = async (endpoint) => {
  if (isApiOffline()) {
    throw new Error("API offline (cooldown)");
  }
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
       throw new Error(`API Error: ${response.statusText}`);
    }
    clearApiOffline();
    return response.json();
  } catch (err) {
    if (err?.name === "TypeError") {
      markApiOffline(err, "db.fetchPublic");
    }
    throw err;
  }
}

export const getPublicScripts = async (ownerId, folder, personaId, organizationId) => {
    let url = "/public-scripts";
    const params = new URLSearchParams();
    if (ownerId) params.append("ownerId", ownerId);
    if (folder) params.append("folder", folder);
    if (personaId) params.append("personaId", personaId);
    if (organizationId) params.append("organizationId", organizationId);
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    return fetchPublic(url);
};

export const getPublicScript = async (id) => {
    return fetchPublic(`/public-scripts/${id}`);
};

export const getPublicThemes = async () => {
    return fetchPublic("/themes/public");
};

// --- Engagement API ---

export const toggleScriptLike = async (scriptId) => {
    return fetchApi(`/scripts/${scriptId}/like`, {
        method: "POST"
    });
};

export const incrementScriptView = async (scriptId) => {
    return fetchApi(`/scripts/${scriptId}/view`, {
        method: "POST"
    });
};

// --- Organization & Admin API ---

export const getOrganizations = async (ownerId) => {
    const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
    return fetchApi(`/organizations${qs}`);
};

export const getOrganization = async (orgId) => {
    return fetchApi(`/organizations/${orgId}`);
};

export const createOrganization = async (data) => {
    return fetchApi(`/organizations`, {
        method: "POST",
        body: JSON.stringify(data)
    });
};

export const updateOrganization = async (orgId, updates) => {
    return fetchApi(`/organizations/${orgId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
    });
};

export const deleteOrganization = async (orgId) => {
    return fetchApi(`/organizations/${orgId}`, {
        method: "DELETE"
    });
};

export const getOrganizationMembers = async (orgId) => {
    return fetchApi(`/organizations/${orgId}/members`);
};

export const searchOrganizations = async (query) => {
    return fetchApi(`/organizations/search?q=${encodeURIComponent(query)}`);
};

export const inviteOrganizationMember = async (orgId, userId) => {
    return fetchApi(`/organizations/${orgId}/invite`, {
        method: "POST",
        body: JSON.stringify({ userId })
    });
};

export const requestToJoinOrganization = async (orgId) => {
    return fetchApi(`/organizations/${orgId}/request`, {
        method: "POST"
    });
};

export const getOrganizationInvites = async (orgId) => {
    return fetchApi(`/organizations/${orgId}/invites`);
};

export const getOrganizationRequests = async (orgId) => {
    return fetchApi(`/organizations/${orgId}/requests`);
};

export const getMyOrganizationInvites = async () => {
    return fetchApi(`/organizations/me/invites`);
};

export const getMyOrganizationRequests = async () => {
    return fetchApi(`/organizations/me/requests`);
};

export const acceptOrganizationInvite = async (inviteId) => {
    return fetchApi(`/organizations/invites/${inviteId}/accept`, {
        method: "POST"
    });
};

export const declineOrganizationInvite = async (inviteId) => {
    return fetchApi(`/organizations/invites/${inviteId}/decline`, {
        method: "POST"
    });
};

export const acceptOrganizationRequest = async (requestId) => {
    return fetchApi(`/organizations/requests/${requestId}/accept`, {
        method: "POST"
    });
};

export const declineOrganizationRequest = async (requestId) => {
    return fetchApi(`/organizations/requests/${requestId}/decline`, {
        method: "POST"
    });
};


export const transferOrganizationOwnership = async (orgId, targetUserId) => {
    return fetchApi(`/organizations/${orgId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ newOwnerId: targetUserId, transferScripts: false })
    });
};

export const transferScriptOwnership = async (scriptId, targetUserId) => {
    return fetchApi(`/scripts/${scriptId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ newOwnerId: targetUserId })
    });
};

// --- Persona API ---
export const transferPersonaOwnership = async (personaId, targetUserId) => {
    return fetchApi(`/personas/${personaId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ newOwnerId: targetUserId })
    });
};

// --- Admin ---
export const searchUsers = async (query) => {
    return fetchApi(`/admin/users?q=${encodeURIComponent(query)}`);
};

export const getPersonas = async (ownerId) => {
    const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
    return fetchApi(`/personas${qs}`);
};

export const createPersona = async (data) => {
    return fetchApi("/personas", {
        method: "POST",
        body: JSON.stringify(data)
    });
};

export const updatePersona = async (id, data) => {
    return fetchApi(`/personas/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    });
};

export const deletePersona = async (id) => {
    return fetchApi(`/personas/${id}`, {
        method: "DELETE"
    });
};

export const getPublicPersona = async (id) => {
    return fetchPublic(`/public-personas/${id}`);
};

export const getPublicOrganization = async (id) => {
    return fetchPublic(`/public-organizations/${id}`);
};

export const getPublicPersonas = async () => {
    return fetchPublic("/public-personas");
};

export const getPublicOrganizations = async () => {
    return fetchPublic("/public-organizations");
};
