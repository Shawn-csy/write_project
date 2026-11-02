import { fetchApi } from "./client";
import type {
  AdminPaginationQuery,
  ActivityPage,
  ActivitySubmissionRecord,
  AdminVoiceActor,
  AdminDemoRecord,
  AdminDemoTarget,
  AdminDemoMutationPayload,
  BaseScriptApi,
  HomepageBanner,
  OrgData,
  PersonaLike,
  PublicFeedbackListResponse,
  PublicFeedbackRecord,
  PublicDemoSubmissionListResponse,
  PublicDemoSubmissionRecord,
  VoiceActorProfileSubmission,
  VoiceActorProfileSubmissionListResponse,
  ExternalAuthorProfileSubmission,
  ExternalAuthorProfileSubmissionListResponse,
  PublicTermsAcceptanceRecord,
  PublicTermsAcceptancesQuery,
  ScriptMetadataUpdatePayload,
  ScriptMutationResponse,
  SearchUser,
  ExternalPublicScript,
  ExternalAuthorPageProfile,
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

export const getPublicFeedbackAdmin = async ({
  q = "",
  excludeKind,
  status,
  limit = 100,
  offset = 0,
}: AdminPaginationQuery & { excludeKind?: string; status?: "new" | "reviewed" | "closed" } = {}): Promise<PublicFeedbackListResponse> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (excludeKind) params.set("excludeKind", excludeKind);
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchApi(`/admin/public-feedback?${params.toString()}`) as Promise<PublicFeedbackListResponse>;
};

export const deletePublicFeedbackAdmin = async (feedbackId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/admin/public-feedback/${encodeURIComponent(feedbackId)}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};

export const updatePublicFeedbackStatusAdmin = async (
  feedbackId: string,
  status: "new" | "reviewed" | "closed"
): Promise<PublicFeedbackRecord> => {
  return fetchApi(`/admin/public-feedback/${encodeURIComponent(feedbackId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }) as Promise<PublicFeedbackRecord>;
};

export const getPublicDemoSubmissionsAdmin = async ({
  q = "",
  status = "pending",
  limit = 100,
  offset = 0,
}: AdminPaginationQuery & { status?: "all" | "pending" | "approved" | "rejected" } = {}): Promise<PublicDemoSubmissionListResponse> => {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  return fetchApi(`/admin/public-demo-submissions?${params.toString()}`) as Promise<PublicDemoSubmissionListResponse>;
};

export const updatePublicDemoSubmissionStatusAdmin = async (
  submissionId: string,
  status: PublicDemoSubmissionRecord["status"],
): Promise<PublicDemoSubmissionRecord> => fetchApi(`/admin/public-demo-submissions/${encodeURIComponent(submissionId)}/status`, {
  method: "PATCH",
  body: JSON.stringify({ status }),
}) as Promise<PublicDemoSubmissionRecord>;

export const deletePublicDemoSubmissionAdmin = async (submissionId: string): Promise<ScriptMutationResponse> =>
  fetchApi(`/admin/public-demo-submissions/${encodeURIComponent(submissionId)}`, { method: "DELETE" }) as Promise<ScriptMutationResponse>;

export interface VoiceActorClaimRecord {
  id: string; personaId: string; personaName: string; requesterId: string; requesterName: string;
  verifiedEmail: string; proofUrl: string; note: string; status: "pending" | "approved" | "rejected";
  reviewNote: string; reviewedAt?: number | null; createdAt: number;
}
export const getVoiceActorClaimsAdmin = async ({ q = "", status = "pending", limit = 100, offset = 0 }: AdminPaginationQuery & { status?: "all" | "pending" | "approved" | "rejected" } = {}): Promise<{ total: number; items: VoiceActorClaimRecord[] }> => {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  return fetchApi(`/admin/voice-actor-claims?${params.toString()}`) as Promise<{ total: number; items: VoiceActorClaimRecord[] }>;
};
export const updateVoiceActorClaimAdmin = async (id: string, status: "approved" | "rejected", reviewNote = ""): Promise<VoiceActorClaimRecord> => fetchApi(`/admin/voice-actor-claims/${encodeURIComponent(id)}/status`, {
  method: "PATCH", body: JSON.stringify({ status, reviewNote }),
}) as Promise<VoiceActorClaimRecord>;

export const getVoiceActorProfileSubmissionsAdmin = async ({ q = "", status = "pending", limit = 100, offset = 0 }: AdminPaginationQuery & { status?: "all" | "pending" | "approved" | "rejected" } = {}): Promise<VoiceActorProfileSubmissionListResponse> => {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  return fetchApi(`/admin/voice-actor-profile-submissions?${params.toString()}`) as Promise<VoiceActorProfileSubmissionListResponse>;
};

export const updateVoiceActorProfileSubmissionAdmin = async (submissionId: string, status: "approved" | "rejected", acceptedFields: string[] = []): Promise<VoiceActorProfileSubmission> => fetchApi(`/admin/voice-actor-profile-submissions/${encodeURIComponent(submissionId)}/status`, {
  method: "PATCH",
  body: JSON.stringify({ status, acceptedFields }),
}) as Promise<VoiceActorProfileSubmission>;

export const getExternalAuthorProfileSubmissionsAdmin = async ({ q = "", status = "pending", limit = 100, offset = 0 }: AdminPaginationQuery & { status?: "all" | "pending" | "approved" | "rejected" } = {}): Promise<ExternalAuthorProfileSubmissionListResponse> => {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  return fetchApi(`/admin/external-author-profile-submissions?${params.toString()}`) as Promise<ExternalAuthorProfileSubmissionListResponse>;
};

export const updateExternalAuthorProfileSubmissionAdmin = async (submissionId: string, status: "approved" | "rejected", acceptedFields: string[] = []): Promise<ExternalAuthorProfileSubmission> => fetchApi(`/admin/external-author-profile-submissions/${encodeURIComponent(submissionId)}/status`, {
  method: "PATCH",
  body: JSON.stringify({ status, acceptedFields }),
}) as Promise<ExternalAuthorProfileSubmission>;

export const getAllDemosAdmin = async ({ q = "", status = "all", limit = 100, offset = 0 }: AdminPaginationQuery & { status?: "all" | "pending" | "approved" | "rejected" } = {}): Promise<{ total: number; items: AdminDemoRecord[] }> => {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  return fetchApi(`/admin/all-demos?${params.toString()}`) as Promise<{ total: number; items: AdminDemoRecord[] }>;
};

export const getAllDemoTargetsAdmin = async (): Promise<AdminDemoTarget[]> => fetchApi("/admin/all-demos/targets") as Promise<AdminDemoTarget[]>;

export const createAllDemoAdmin = async (payload: AdminDemoMutationPayload): Promise<AdminDemoRecord> => fetchApi("/admin/all-demos", {
  method: "POST",
  body: JSON.stringify(payload),
}) as Promise<AdminDemoRecord>;

export const updateAllDemoAdmin = async (item: AdminDemoRecord, payload: AdminDemoMutationPayload): Promise<AdminDemoRecord> => fetchApi(`/admin/all-demos/${item.sourceKind}/${encodeURIComponent(item.parentId || item.id)}/${encodeURIComponent(item.id)}`, {
  method: "PUT",
  body: JSON.stringify(payload),
}) as Promise<AdminDemoRecord>;

export const deleteAllDemoAdmin = async (item: AdminDemoRecord): Promise<ScriptMutationResponse> => fetchApi(`/admin/all-demos/${item.sourceKind}/${encodeURIComponent(item.parentId || item.id)}/${encodeURIComponent(item.id)}`, { method: "DELETE" }) as Promise<ScriptMutationResponse>;

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

export const getVoiceActorsAdmin = async (q = ""): Promise<AdminVoiceActor[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  return fetchApi(`/admin/voice-actors?${params.toString()}`, { cache: "no-store" }) as Promise<AdminVoiceActor[]>;
};

export const createVoiceActorAdmin = async (displayName: string): Promise<AdminVoiceActor> =>
  fetchApi("/admin/voice-actors", { method: "POST", body: JSON.stringify({ displayName }) }) as Promise<AdminVoiceActor>;

export const updateVoiceActorAdmin = async (id: string, payload: Pick<AdminVoiceActor, "displayName" | "bio" | "avatar" | "website" | "links" | "voiceActorHidden">): Promise<AdminVoiceActor> =>
  fetchApi(`/admin/voice-actors/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }) as Promise<AdminVoiceActor>;

export const deleteVoiceActorAdmin = async (id: string): Promise<{ success: boolean; preservedAuthor?: boolean }> =>
  fetchApi(`/admin/voice-actors/${encodeURIComponent(id)}`, { method: "DELETE" }) as Promise<{ success: boolean; preservedAuthor?: boolean }>;

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
    ? payload.items.map((item, idx) => {
        const imageBackgroundMode = item?.imageBackgroundMode;
        return {
          id: String(item?.id || `slide-${idx + 1}`),
          eyebrow: String(item?.eyebrow || "").trim(),
          title: String(item?.title || ""),
          content: String(item?.content || ""),
          link: String(item?.link || ""),
          imageUrl: String(item?.imageUrl || ""),
          imageAlt: String(item?.imageAlt || "").trim(),
          imageCrop: item?.imageCrop ?? null,
          imageMobileCrop: item?.imageMobileCrop ?? null,
          imageDesktopCrop: item?.imageDesktopCrop ?? null,
          imageUltraWideCrop: item?.imageUltraWideCrop ?? null,
          ...(imageBackgroundMode === "cover" || imageBackgroundMode === "blur-fill"
            ? { imageBackgroundMode }
            : { imageBackgroundMode: null }),
        };
      })
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

export type ActivityPagePayload = Pick<ActivityPage, "slug" | "title" | "summary" | "coverUrl" | "coverCrop" | "body" | "scriptIds" | "externalScriptIds" | "acceptingSubmissions" | "status" | "sortOrder">;

export const getActivityPagesAdmin = async (): Promise<ActivityPage[]> =>
  fetchApi("/admin/activity-pages", { cache: "no-store" }) as Promise<ActivityPage[]>;

export const createActivityPageAdmin = async (payload: ActivityPagePayload): Promise<ActivityPage> =>
  fetchApi("/admin/activity-pages", { method: "POST", body: JSON.stringify(payload) }) as Promise<ActivityPage>;

export const updateActivityPageAdmin = async (id: string, payload: ActivityPagePayload): Promise<ActivityPage> =>
  fetchApi(`/admin/activity-pages/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }) as Promise<ActivityPage>;

export const deleteActivityPageAdmin = async (id: string): Promise<{ success: boolean }> =>
  fetchApi(`/admin/activity-pages/${encodeURIComponent(id)}`, { method: "DELETE" }) as Promise<{ success: boolean }>;

export const getActivitySubmissionsAdmin = async (pageId: string): Promise<ActivitySubmissionRecord[]> => {
  const result = await fetchApi(`/admin/activity-pages/${encodeURIComponent(pageId)}/submissions`, { cache: "no-store" }) as { items: ActivitySubmissionRecord[] };
  return result.items || [];
};

export const updateActivitySubmissionAdmin = async (pageId: string, item: ActivitySubmissionRecord): Promise<ActivitySubmissionRecord> =>
  fetchApi(`/admin/activity-pages/${encodeURIComponent(pageId)}/submissions/${item.kind}/${encodeURIComponent(item.id)}`, {
    method: "PUT", body: JSON.stringify({ title: item.title, summary: item.summary, link: item.link, coverUrl: item.coverUrl, voiceTypes: item.voiceTypes }),
  }) as Promise<ActivitySubmissionRecord>;

export const deleteActivitySubmissionAdmin = async (pageId: string, item: ActivitySubmissionRecord): Promise<{ success: boolean }> =>
  fetchApi(`/admin/activity-pages/${encodeURIComponent(pageId)}/submissions/${item.kind}/${encodeURIComponent(item.id)}`, { method: "DELETE" }) as Promise<{ success: boolean }>;

export interface ExternalPublicScriptPreview {
  sourceUrl: string;
  canonicalUrl?: string;
  sourceDomain?: string;
  sourceName?: string;
  authorName?: string;
  authorBio?: string;
  authorUrl?: string;
  authorAvatarUrl?: string;
  organizationName?: string;
  organizationBio?: string;
  organizationUrl?: string;
  organizationAvatarUrl?: string;
  remoteTitle?: string;
  remoteSummary?: string;
  remoteCoverUrl?: string;
  sourceCreatedAt?: number | null;
  sourceModifiedAt?: number | null;
  coverPreviewDataUrl?: string;
}

export interface ExternalPublicScriptPayload {
  sourceUrl: string;
  canonicalUrl?: string;
  sourceDomain?: string;
  sourceName?: string;
  authorName?: string;
  authorBio?: string;
  authorUrl?: string;
  authorAvatarUrl?: string;
  organizationName?: string;
  organizationBio?: string;
  organizationUrl?: string;
  organizationAvatarUrl?: string;
  remoteTitle?: string;
  remoteSummary?: string;
  remoteCoverUrl?: string;
  titleOverride?: string;
  summaryOverride?: string;
  coverUrlOverride?: string;
  seriesName?: string;
  seriesOrder?: number | null;
  demoLinks?: Array<{ id?: string; name?: string; url: string; cast?: string; description?: string }>;
  categories?: string[];
  status?: "draft" | "published" | "hidden";
  sortOrder?: number;
  mountedAt?: number;
  refreshMetadata?: boolean;
}

const externalPublicScriptPath = "/admin/external-public-scripts";

export const getExternalPublicScriptsAdmin = async (): Promise<ExternalPublicScript[]> => {
  return fetchApi(externalPublicScriptPath, { cache: "no-store" }) as Promise<ExternalPublicScript[]>;
};

export const previewExternalPublicScriptAdmin = async (
  sourceUrl: string,
  profileUrls?: { authorUrl?: string; organizationUrl?: string },
): Promise<ExternalPublicScriptPreview> => {
  return fetchApi(`${externalPublicScriptPath}/preview`, {
    method: "POST",
    body: JSON.stringify({ sourceUrl, ...(profileUrls || {}) }),
  }) as Promise<ExternalPublicScriptPreview>;
};

export const createExternalPublicScriptAdmin = async (payload: ExternalPublicScriptPayload): Promise<ExternalPublicScript> => {
  return fetchApi(externalPublicScriptPath, {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<ExternalPublicScript>;
};

export const updateExternalPublicScriptAdmin = async (
  id: string,
  payload: Partial<ExternalPublicScriptPayload>,
): Promise<ExternalPublicScript> => {
  return fetchApi(`${externalPublicScriptPath}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }) as Promise<ExternalPublicScript>;
};

export const deleteExternalPublicScriptAdmin = async (id: string): Promise<{ success: boolean }> => {
  return fetchApi(`${externalPublicScriptPath}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }) as Promise<{ success: boolean }>;
};

export const getExternalAuthorPageProfilesAdmin = async (): Promise<ExternalAuthorPageProfile[]> =>
  fetchApi("/admin/external-author-pages", { cache: "no-store" }) as Promise<ExternalAuthorPageProfile[]>;

export const saveExternalAuthorPageProfileAdmin = async (
  profile: ExternalAuthorPageProfile,
): Promise<ExternalAuthorPageProfile> => fetchApi("/admin/external-author-pages", {
  method: "PUT",
  body: JSON.stringify(profile),
}) as Promise<ExternalAuthorPageProfile>;

export const hideExternalAuthorPageAdmin = async (authorKey: string): Promise<ExternalAuthorPageProfile> =>
  fetchApi(`/admin/external-author-pages?authorKey=${encodeURIComponent(authorKey)}`, {
    method: "DELETE",
  }) as Promise<ExternalAuthorPageProfile>;
