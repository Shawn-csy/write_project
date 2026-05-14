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
  return fetchPublic(url) as Promise<BaseScriptApi[]>;
};

export const getPublicScript = async (id: string): Promise<BaseScriptApi> => fetchPublic(`/public-scripts/${id}`) as Promise<BaseScriptApi>;
export const getPublicThemes = async (): Promise<Array<Record<string, unknown>>> => fetchPublic("/themes/public") as Promise<Array<Record<string, unknown>>>;
export const getPublicTermsConfig = async (): Promise<PublicTermsConfig | null> =>
  fetchPublic("/public-terms-config", { cacheTtlMs: 60000 }) as Promise<PublicTermsConfig | null>;
export const getPublicHomepageBanner = async (): Promise<HomepageBanner | null> =>
  fetchPublic("/public-homepage-banner", { cacheTtlMs: 60000 }) as Promise<HomepageBanner | null>;
export const acceptPublicTerms = async (payload: PublicTermsAcceptancePayload): Promise<Record<string, unknown>> =>
  fetchPublic("/public-terms-acceptances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    noCache: true,
  }) as Promise<Record<string, unknown>>;

export const getPublicPersona = async (id: string): Promise<PersonaLike> => fetchPublic(`/public-personas/${id}`) as Promise<PersonaLike>;
export const getPublicOrganization = async (id: string): Promise<OrgData> => fetchPublic(`/public-organizations/${id}`) as Promise<OrgData>;
export const getPublicPersonas = async (): Promise<PersonaLike[]> => fetchPublic("/public-personas") as Promise<PersonaLike[]>;
export const getPublicOrganizations = async (): Promise<OrgData[]> => fetchPublic("/public-organizations") as Promise<OrgData[]>;
export const getPublicBundle = async (): Promise<PublicBundleResponse> =>
  fetchPublic("/public-bundle", { cacheTtlMs: 15000 }) as Promise<PublicBundleResponse>;
