import type { CurrentUserLike } from "./user";
import type { MarkerConfig } from "./script";
import type { PersonaLike, OrgData, TagLike } from "./persona";
import type { CoverDesign } from "./coverDesign";

export type { PersonaLike, OrgData, TagLike };

export interface ApiListResponse<T> {
  items: T[];
  total?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

export interface ScriptOwnerLike {
  id?: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string;
}

export interface ScriptSeriesLike {
  id?: string;
  name?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

export interface BaseScriptApi {
  id: string;
  title: string;
  content?: string;
  folder?: string;
  ownerId?: string;
  lastModified?: number;
  updatedAt?: number | string;
  draftDate?: string;
  status?: string;
  type?: string;
  coverUrl?: string | null;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  coverDesign?: CoverDesign | null;
  hasPublishIdentity?: boolean;
  metadataSeriesName?: string;
  publishReadiness?: "needs_work" | "ready" | "published";
  markerThemeId?: string;
  markerTheme?: { configs?: MarkerConfig[] };
  customMetadata?: Array<{ key?: string; value?: string; type?: string }>;
  tags?: Array<{ id?: string; name: string }>;
  targetAudience?: string | null;
  contentRating?: string | null;
  license?: string | null;
  licenseSpecialTerms?: string | null;
  authorDisplayMode?: string | null;
  authorOverrideName?: string | null;
  views?: number;
  likes?: number;
  seriesId?: string | null;
  seriesOrder?: number | null;
  series?: ScriptSeriesLike;
  synopsis?: string | null;
  outline?: string | null;
  activityName?: string | null;
  activityBannerUrl?: string | null;
  activityContent?: string | null;
  activityWorkUrl?: string | null;
  activityDemoLinks?: string | null;  // JSON string
  organizationId?: string | null;
  organization?: OrgData;
  personaId?: string | null;
  persona?: Partial<PersonaLike>;
  owner?: ScriptOwnerLike;
  author?: string | ScriptOwnerLike;
  [key: string]: unknown;
}

export interface StudioScriptCounts {
  all: number;
  needs_work: number;
  ready: number;
  published: number;
}

export interface StudioScriptsResponse {
  items: BaseScriptApi[];
  total: number;
  limit: number;
  offset: number;
  nextOffset?: number | null;
  counts: StudioScriptCounts;
}

export interface StudioBootstrapResponse {
  scripts: StudioScriptsResponse;
  personas: PersonaLike[];
  organizations: OrgData[];
  tags: TagLike[];
  series: SeriesLike[];
  myInvites: OrganizationInvite[];
}

export interface ScriptCreatePayload {
  title: string;
  type?: string;
  folder?: string;
}

export interface ScriptCreateResponse {
  id: string;
}

export type ScriptUpdatePayload = Partial<BaseScriptApi>;

export interface ScriptReorderItem {
  id: string;
  order?: number;
  sortOrder?: number;
  folder?: string;
}

export interface ScriptMutationResponse {
  ok?: boolean;
  success?: boolean;
  newOwnerId?: string;
}

export interface OrganizationMember {
  id: string;
  uid?: string;
  userId?: string;
  displayName?: string;
  email?: string;
  role?: string;
}

export interface OrganizationInvite {
  id: string;
  orgId?: string;
  userId?: string;
  displayName?: string;
  email?: string;
  role?: string;
}

export interface OrganizationRequest {
  id: string;
  orgId?: string;
  userId?: string;
  displayName?: string;
  email?: string;
  message?: string;
}

export interface OrganizationMembersResponse {
  users: OrganizationMember[];
  personas: Array<Record<string, unknown>>;
}

export interface OrganizationInvitesResponse {
  invites: OrganizationInvite[];
}

export interface OrganizationRequestsResponse {
  requests: OrganizationRequest[];
}

export type OrganizationPayload = Partial<OrgData> & {
  name?: string;
  description?: string;
};

export type PersonaPayload = Partial<PersonaLike> & {
  displayName?: string;
};

export interface SeriesLike {
  id: string;
  name?: string;
  description?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  slug?: string;
  scriptCount?: number;
  updatedAt?: number;
}

export interface SeriesPayload {
  name?: string;
  description?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

export interface SeriesReorderItem {
  scriptId: string;
  seriesOrder: number | null;
}

export interface PublicTermsConfig {
  required?: boolean;
  version?: string;
  title?: string;
  intro?: string;
  content?: string;
  sections?: Array<{
    id?: string;
    title?: string;
    body?: string;
  }>;
  requiredChecks?: Array<{
    id: string;
    label?: string;
  }>;
  updatedAt?: string | number;
  [key: string]: unknown;
}

export interface HomepageBannerItem {
  id: string;
  title?: string;
  content?: string;
  link?: string;
  imageUrl?: string;
  imageCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

export interface HomepageBanner {
  title?: string;
  content?: string;
  link?: string;
  imageUrl?: string;
  items?: HomepageBannerItem[];
}

export interface PublicBundleResponse {
  scripts?: BaseScriptApi[];
  personas?: PersonaLike[];
  organizations?: OrgData[];
  themes?: Array<Record<string, unknown>>;
  termsConfig?: PublicTermsConfig | null;
  banner?: HomepageBanner | null;
  [key: string]: unknown;
}

export interface TagApi {
  id: string;
  name: string;
  color?: string;
}

export interface PublicTermsAcceptancePayload {
  termsVersion?: string;
  scriptId?: string;
  version?: string;
  acceptedAt?: string | number;
  visitorId?: string;
  locale?: string;
  timezone?: string;
  timezoneOffsetMinutes?: number;
  userAgent?: string;
  platform?: string;
  screen?: {
    width?: number;
    height?: number;
    colorDepth?: number;
    pixelRatio?: number;
  };
  viewport?: {
    width?: number;
    height?: number;
  };
  pagePath?: string;
  referrer?: string;
  acceptedChecks?: string[];
}

export interface SearchUser {
  id: string;
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export interface AdminPaginationQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface PublicTermsAcceptancesQuery extends AdminPaginationQuery {}

export interface PublicTermsAcceptanceRecord {
  id: string;
  userId?: string;
  scriptId?: string;
  version?: string;
  acceptedAt?: string | number;
}

export interface ScriptMetadataUpdatePayload {
  title?: string;
  author?: string;
  draftDate?: string;
  status?: string;
  markerThemeId?: string | null;
  coverUrl?: string | null;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  organizationId?: string | null;
  personaId?: string | null;
  disableCopy?: boolean;
  seriesId?: string | null;
  seriesOrder?: number | null;
  licenseCommercial?: string;
  licenseDerivative?: string;
  licenseNotify?: string;
  targetAudience?: string | null;
  contentRating?: string | null;
  license?: string | null;
  licenseSpecialTerms?: string | null;
  authorDisplayMode?: string | null;
  authorOverrideName?: string | null;
  customMetadata?: Array<Record<string, unknown>>;
  tags?: Array<string | TagLike>;
}

export interface UserSettingsResponse {
  settings?: Record<string, unknown>;
  displayName?: string | null;
  avatar?: string | null;
  handle?: string | null;
}

export interface MarkerThemeApi {
  id: string;
  name: string;
  configs: MarkerConfig[];
  layoutConfig?: import('../lib/v2').LayoutConfig;
  isPublic?: boolean;
  description?: string;
}

export interface SaveUserSettingsPayload {
  settings: Record<string, unknown>;
  displayName?: string | null;
  avatar?: string | null;
  handle?: string | null;
}

export type AuthUser = CurrentUserLike | null | undefined;
