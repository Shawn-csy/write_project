import { fetchPublic } from "./client";

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

export const getPublicScript = async (id) => fetchPublic(`/public-scripts/${id}`);
export const getPublicThemes = async () => fetchPublic("/themes/public");

export const getPublicPersona = async (id) => fetchPublic(`/public-personas/${id}`);
export const getPublicOrganization = async (id) => fetchPublic(`/public-organizations/${id}`);
export const getPublicPersonas = async () => fetchPublic("/public-personas");
export const getPublicOrganizations = async () => fetchPublic("/public-organizations");
export const getPublicBundle = async () => fetchPublic("/public-bundle", { cacheTtlMs: 15000 });
