import { fetchPublic } from "./client";
import type {
  BaseScriptApi,
  HomepageBanner,
  OrgData,
  PersonaLike,
  PublicBundleResponse,
  PublicTermsAcceptancePayload,
  PublicTermsConfig,
} from "../../types/api";

export const getPublicScripts = async (
  ownerId?: string,
  folder?: string,
  personaId?: string,
  organizationId?: string
): Promise<BaseScriptApi[]> => {
  let url = "/public-scripts";
  const params = new URLSearchParams();
  if (ownerId) params.append("ownerId", ownerId);
  if (folder) params.append("folder", folder);
  if (personaId) params.append("personaId", personaId);
  if (organizationId) params.append("organizationId", organizationId);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  return fetchPublic<BaseScriptApi[]>(url);
};

export const getPublicScript = async (id: string): Promise<BaseScriptApi> => fetchPublic<BaseScriptApi>(`/public-scripts/${id}`);
export const getPublicThemes = async (): Promise<Array<Record<string, unknown>>> => fetchPublic<Array<Record<string, unknown>>>("/themes/public");
export const getPublicTermsConfig = async (): Promise<PublicTermsConfig | null> =>
  fetchPublic<PublicTermsConfig | null>("/public-terms-config", { cacheTtlMs: 60000 });
export const getPublicHomepageBanner = async (): Promise<HomepageBanner | null> =>
  fetchPublic<HomepageBanner | null>("/public-homepage-banner", { cacheTtlMs: 60000 });
export const acceptPublicTerms = async (payload: PublicTermsAcceptancePayload): Promise<Record<string, unknown>> =>
  fetchPublic("/public-terms-acceptances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    noCache: true,
  });

export const getPublicPersona = async (id: string): Promise<PersonaLike> => fetchPublic<PersonaLike>(`/public-personas/${id}`);
export const getPublicOrganization = async (id: string): Promise<OrgData> => fetchPublic<OrgData>(`/public-organizations/${id}`);
export const getPublicPersonas = async (): Promise<PersonaLike[]> => fetchPublic<PersonaLike[]>("/public-personas");
export const getPublicOrganizations = async (): Promise<OrgData[]> => fetchPublic<OrgData[]>("/public-organizations");
export const getPublicBundle = async (): Promise<PublicBundleResponse> =>
  fetchPublic<PublicBundleResponse>("/public-bundle", { cacheTtlMs: 15000 });
