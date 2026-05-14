import type { CurrentUserLike } from "./user";
import type { MarkerConfig } from "./script";
import type { PersonaLike, OrgData, TagLike } from "./persona";

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
  markerThemeId?: string;
  markerTheme?: { configs?: MarkerConfig[] };
  customMetadata?: Array<{ key?: string; value?: string; type?: string }>;
  tags?: Array<{ id?: string; name: string }>;
  views?: number;
  likes?: number;
  seriesId?: string | null;
  seriesOrder?: number | null;
  series?: ScriptSeriesLike;
  organizationId?: string | null;
  organization?: OrgData;
  personaId?: string | null;
  persona?: Partial<PersonaLike>;
  owner?: ScriptOwnerLike;
  author?: string | ScriptOwnerLike;
  [key: string]: unknown;
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
}

export interface SeriesPayload {
  name?: string;
  description?: string;
  summary?: string;
  coverUrl?: string;
}

export interface PublicTermsConfig {
  required?: boolean;
  version?: string;
  content?: string;
  updatedAt?: string | number;
  [key: string]: unknown;
}

export interface HomepageBannerItem {
  id: string;
  title?: string;
  content?: string;
  link?: string;
  imageUrl?: string;
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
  organizationId?: string | null;
  personaId?: string | null;
  disableCopy?: boolean;
  seriesId?: string | null;
  seriesOrder?: number | null;
  licenseCommercial?: string;
  licenseDerivative?: string;
  licenseNotify?: string;
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
