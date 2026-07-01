import { fetchApi } from "./client";
import type {
  AdminPaginationQuery,
  BaseScriptApi,
  HomepageBanner,
  OrgData,
  PersonaLike,
  PublicTermsAcceptanceRecord,
  PublicTermsAcceptancesQuery,
  ScriptMetadataUpdatePayload,
  ScriptMutationResponse,
  SearchUser,
} from "../../types/api";
import type { MarkerConfig } from "../../types/script";

export const searchUsers = async (query: string): Promise<SearchUser[]> => {
  return fetchApi(`/admin/users?q=${encodeURIComponent(query)}`) as Promise<SearchUser[]>;
};

export const getPublicTermsAcceptances = async ({
  q = "",
  limit = 50,
  offset = 0,
}: PublicTermsAcceptancesQuery = {}): Promise<PublicTermsAcceptanceRecord[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/public-terms-acceptances?${params.toString()}`) as Promise<PublicTermsAcceptanceRecord[]>;
};

export const getAdminUsers = async (): Promise<SearchUser[]> => {
  return fetchApi("/admin/admin-users") as Promise<SearchUser[]>;
};

export const addAdminUser = async (payload: { id?: string; uid?: string; email?: string }): Promise<ScriptMutationResponse> => {
  return fetchApi("/admin/admin-users", {
    method: "POST",
    body: JSON.stringify(payload || {}),
  }) as Promise<ScriptMutationResponse>;
};

export const removeAdminUser = async (adminId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/admin/admin-users/${encodeURIComponent(adminId)}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const getAllUsersAdmin = async ({ q = "", limit = 200, offset = 0 }: AdminPaginationQuery = {}): Promise<SearchUser[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-users?${params.toString()}`) as Promise<SearchUser[]>;
};

export const deleteUserAdmin = async (userId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/admin/all-users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const getAllOrganizationsAdmin = async ({ q = "", limit = 200, offset = 0 }: AdminPaginationQuery = {}): Promise<OrgData[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-organizations?${params.toString()}`) as Promise<OrgData[]>;
};

export const getAllPersonasAdmin = async ({ q = "", limit = 200, offset = 0 }: AdminPaginationQuery = {}): Promise<PersonaLike[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-personas?${params.toString()}`) as Promise<PersonaLike[]>;
};

export const getAllScriptsAdmin = async ({ q = "", limit = 300, offset = 0 }: AdminPaginationQuery = {}): Promise<BaseScriptApi[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/all-scripts?${params.toString()}`) as Promise<BaseScriptApi[]>;
};

export const deleteOrganizationAdmin = async (orgId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/admin/all-organizations/${encodeURIComponent(orgId)}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const deletePersonaAdmin = async (personaId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/admin/all-personas/${encodeURIComponent(personaId)}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const deleteScriptAdmin = async (scriptId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/admin/all-scripts/${encodeURIComponent(scriptId)}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const updateScriptMetadataAdmin = async (scriptId: string, payload: ScriptMetadataUpdatePayload = {}): Promise<BaseScriptApi> => {
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
  }) as Promise<BaseScriptApi>;
};

export const getScriptMetadataAdmin = async (scriptId: string): Promise<BaseScriptApi> => {
  return fetchApi(`/admin/all-scripts/${encodeURIComponent(scriptId)}/metadata`) as Promise<BaseScriptApi>;
};

export const getDefaultMarkerConfigsAdmin = async (): Promise<MarkerConfig[]> => {
  return fetchApi("/admin/default-marker-configs") as Promise<MarkerConfig[]>;
};

export const updateDefaultMarkerConfigsAdmin = async (configs: MarkerConfig[] = []): Promise<MarkerConfig[]> => {
  return fetchApi("/admin/default-marker-configs", {
    method: "PUT",
    body: JSON.stringify(Array.isArray(configs) ? configs : []),
  }) as Promise<MarkerConfig[]>;
};

export const getHomepageBannerAdmin = async (): Promise<HomepageBanner> => {
  return fetchApi("/admin/homepage-banner", { cache: "no-store" }) as Promise<HomepageBanner>;
};

export const updateHomepageBannerAdmin = async (payload: HomepageBanner = {}): Promise<HomepageBanner> => {
  const normalizedItems = Array.isArray(payload?.items)
    ? payload.items.map((item, idx) => ({
        id: String(item?.id || `slide-${idx + 1}`),
        title: String(item?.title || ""),
        content: String(item?.content || ""),
        link: String(item?.link || ""),
        imageUrl: String(item?.imageUrl || ""),
        ...(item?.imageCrop != null ? { imageCrop: item.imageCrop } : {}),
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
  }) as Promise<HomepageBanner>;
};
