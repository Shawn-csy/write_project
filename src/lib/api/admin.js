import { fetchApi } from "./client";

export const searchUsers = async (query) => {
  return fetchApi(`/admin/users?q=${encodeURIComponent(query)}`);
};

export const getPublicTermsAcceptances = async ({ q = "", limit = 50, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/public-terms-acceptances?${params.toString()}`);
};

export const getAdminUsers = async () => {
  return fetchApi("/admin/admin-users");
};

export const addAdminUser = async (payload) => {
  return fetchApi("/admin/admin-users", {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
};

export const removeAdminUser = async (adminId) => {
  return fetchApi(`/admin/admin-users/${encodeURIComponent(adminId)}`, {
    method: "DELETE",
  });
};

export const getAllUsersAdmin = async ({ q = "", limit = 200, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-users?${params.toString()}`);
};

export const deleteUserAdmin = async (userId) => {
  return fetchApi(`/admin/all-users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
};

export const getAllOrganizationsAdmin = async ({ q = "", limit = 200, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-organizations?${params.toString()}`);
};

export const getAllPersonasAdmin = async ({ q = "", limit = 200, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-personas?${params.toString()}`);
};

export const getAllScriptsAdmin = async ({ q = "", limit = 300, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-scripts?${params.toString()}`);
};

export const deleteOrganizationAdmin = async (orgId) => {
  return fetchApi(`/admin/all-organizations/${encodeURIComponent(orgId)}`, {
    method: "DELETE",
  });
};

export const deletePersonaAdmin = async (personaId) => {
  return fetchApi(`/admin/all-personas/${encodeURIComponent(personaId)}`, {
    method: "DELETE",
  });
};

export const deleteScriptAdmin = async (scriptId) => {
  return fetchApi(`/admin/all-scripts/${encodeURIComponent(scriptId)}`, {
    method: "DELETE",
  });
};

export const updateScriptMetadataAdmin = async (scriptId, payload = {}) => {
  const body = {
    title: payload?.title,
    author: payload?.author,
    draftDate: payload?.draftDate,
    status: payload?.status,
    markerThemeId: payload?.markerThemeId,
    coverUrl: payload?.coverUrl,
    organizationId: payload?.organizationId,
    personaId: payload?.personaId,
    disableCopy: payload?.disableCopy,
    seriesId: payload?.seriesId,
    seriesOrder: payload?.seriesOrder,
    licenseCommercial: payload?.licenseCommercial,
    licenseDerivative: payload?.licenseDerivative,
    licenseNotify: payload?.licenseNotify,
    customMetadata: Array.isArray(payload?.customMetadata) ? payload.customMetadata : [],
    tags: Array.isArray(payload?.tags) ? payload.tags : [],
  };
  return fetchApi(`/admin/all-scripts/${encodeURIComponent(scriptId)}/metadata`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

export const getScriptMetadataAdmin = async (scriptId) => {
  return fetchApi(`/admin/all-scripts/${encodeURIComponent(scriptId)}/metadata`);
};

export const getDefaultMarkerConfigsAdmin = async () => {
  return fetchApi("/admin/default-marker-configs");
};

export const updateDefaultMarkerConfigsAdmin = async (configs = []) => {
  return fetchApi("/admin/default-marker-configs", {
    method: "PUT",
    body: JSON.stringify(Array.isArray(configs) ? configs : []),
  });
};

export const getHomepageBannerAdmin = async () => {
  return fetchApi("/admin/homepage-banner", { cache: "no-store" });
};

export const updateHomepageBannerAdmin = async (payload = {}) => {
  const normalizedItems = Array.isArray(payload?.items)
    ? payload.items.map((item, idx) => ({
        id: String(item?.id || `slide-${idx + 1}`),
        title: String(item?.title || ""),
        content: String(item?.content || ""),
        link: String(item?.link || ""),
        imageUrl: String(item?.imageUrl || ""),
      }))
    : [];
  return fetchApi("/admin/homepage-banner", {
    method: "PUT",
    body: JSON.stringify({
      title: String(payload?.title || ""),
      content: String(payload?.content || ""),
      link: String(payload?.link || ""),
      imageUrl: String(payload?.imageUrl || ""),
      items: normalizedItems,
    }),
  });
};
