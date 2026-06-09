export interface ScriptOwner {
  id?: string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string;
}

export interface ScriptSeries {
  id?: string;
  name?: string;
  summary?: string;
  coverUrl?: string;
}

export interface ScriptPersona {
  id?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
}

export interface ScriptOrg {
  id?: string;
  name?: string;
  logoUrl?: string;
  description?: string;
}

export interface PublicScript {
  id: string;
  title: string;
  content?: string;
  synopsis?: string | null;
  coverUrl?: string | null;
  tags?: Array<{ id?: string; name: string }>;
  views?: number;
  likes?: number;
  lastModified?: number;
  updatedAt?: number | string;
  seriesId?: string | null;
  seriesOrder?: number | null;
  series?: ScriptSeries | null;
  owner?: ScriptOwner;
  persona?: ScriptPersona | null;
  organization?: ScriptOrg | null;
  customMetadata?: Array<{ key?: string; value?: string }>;
  isPublic?: number | boolean;
  [key: string]: unknown;
}

export interface PublicOrg {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  tags?: string[];
  members?: PublicPersona[];
}

export interface PublicPersona {
  id: string;
  ownerId?: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  bannerUrl?: string;
  website?: string;
  links?: Array<{ url?: string; label?: string }> | string;
  tags?: string[];
  organizationIds?: string[];
  organizations?: PublicOrg[];
}
