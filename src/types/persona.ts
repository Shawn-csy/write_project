export interface LinkItem {
  url?: string;
  label?: string;
}

export interface PersonaLike {
  id: string;
  displayName?: string;
  bio?: string;
  website?: string;
  links?: LinkItem[] | string;
  avatar?: string;
  bannerUrl?: string;
  organizationIds?: string[];
  tags?: string[];
  defaultLicenseCommercial?: string;
  defaultLicenseDerivative?: string;
  defaultLicenseNotify?: string;
  defaultLicenseSpecialTerms?: string[];
  [key: string]: unknown;
}

export interface OrgData {
  id: string;
  name?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  tags?: string[];
  ownerId?: string;
  organizationRole?: string;
  myRole?: string;
  memberRole?: string;
  role?: string;
  ownerUid?: string;
  ownerUserId?: string;
  [key: string]: unknown;
}

export interface TagLike {
  name?: string;
  [key: string]: unknown;
}
