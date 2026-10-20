import type {
  AuthorLike,
  GalleryScriptInput,
  OrgLike,
} from "@write/public-ui";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "./types";
import { externalEntityHref, socialAvatarUrl } from "./externalEntity";

function toTimestamp(value?: number | string | null): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** The date shown on a public card is the script's original publication date. */
export function getPublicScriptPublishedTimestamp(script: Pick<PublicScript, "createdAt" | "draftDate" | "lastModified" | "updatedAt">): number {
  return (
    toTimestamp(script.createdAt) ||
    toTimestamp(script.draftDate) ||
    toTimestamp(script.lastModified) ||
    toTimestamp(script.updatedAt)
  );
}

function formatGalleryDate(value?: number | string | null): { label?: string; time?: string } {
  if (value == null || value === "") return {};
  const timestamp = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(timestamp) || timestamp <= 0) return {};
  const date = new Date(timestamp);
  return {
    label: new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "numeric", day: "numeric" }).format(date),
    time: date.toISOString(),
  };
}

export function toGalleryInput(script: PublicScript): GalleryScriptInput {
  const displayDate = formatGalleryDate(getPublicScriptPublishedTimestamp(script));
  const hasCustomAuthor =
    String(script.authorDisplayMode || "").trim().toLowerCase() === "override" ||
    Boolean(String(script.authorOverrideName || "").trim());
  return {
    id: script.id,
    title: script.title,
    synopsis: script.synopsis ?? undefined,
    outline: script.outline ?? undefined,
    coverUrl: script.coverUrl ?? undefined,
    coverCrop: script.coverCrop ?? undefined,
    coverDesign: script.coverDesign ?? undefined,
    tags: (script.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
    views: script.views,
    createdAt: script.createdAt,
    draftDate: script.draftDate,
    lastModified: script.lastModified,
    updatedAt: script.updatedAt ?? undefined,
    dateLabel: displayDate.label,
    dateTime: displayDate.time,
    seriesOrder: script.seriesOrder ?? undefined,
    series: script.series ?? undefined,
    targetAudience: script.targetAudience ?? undefined,
    contentRating: script.contentRating ?? undefined,
    license: script.license ?? undefined,
    licenseSpecialTerms: script.licenseSpecialTerms ?? undefined,
    authorDisplayMode: script.authorDisplayMode ?? undefined,
    authorOverrideName: script.authorOverrideName ?? undefined,
    licenseCommercial: script.licenseCommercial ?? undefined,
    licenseDerivative: script.licenseDerivative ?? undefined,
    licenseNotify: script.licenseNotify ?? undefined,
    author: script.persona
      ? {
          id: script.persona.id,
          displayName: script.persona.displayName,
          avatarUrl: script.persona.avatar,
        }
      : script.owner
      ? {
          id: script.owner.id,
          displayName: script.owner.displayName,
          avatarUrl: script.owner.avatar ?? script.owner.avatarUrl,
        }
      : null,
    organization: !hasCustomAuthor && script.organization?.name
      ? {
          name: script.organization.name,
          logoUrl: script.organization.logoUrl,
        }
      : null,
    persona: script.persona
      ? {
          defaultLicenseCommercial: script.persona.defaultLicenseCommercial,
          defaultLicenseDerivative: script.persona.defaultLicenseDerivative,
          defaultLicenseNotify: script.persona.defaultLicenseNotify,
        }
      : null,
    customMetadata: script.customMetadata ?? undefined,
  };
}

export function toAuthorLike(persona: PublicPersona): AuthorLike {
  return {
    id: persona.id,
    displayName: persona.displayName,
    avatarUrl: persona.avatar,
    tags: persona.tags,
  };
}

export function toOrgLike(org: PublicOrg): OrgLike {
  return {
    id: org.id,
    name: org.name,
    tags: org.tags,
  };
}

/** Build author identities for published external-script entries. */
export function externalPersonasFromScripts(items: ExternalPublicScript[]): PublicPersona[] {
  const map = new Map<string, PublicPersona>();
  for (const item of items) {
    const displayName = item.authorName?.trim();
    if (!displayName) continue;
    const key = displayName.toLocaleLowerCase();
    const current = map.get(key);
    const tags = Array.from(new Set([...(current?.tags || []), ...(item.categories || [])]));
    map.set(key, {
      ...(current || {}),
      id: current?.id || `external-author:${displayName}`,
      displayName,
      bio: current?.bio || item.authorBio || undefined,
      website: current?.website || item.authorUrl || undefined,
      avatar: current?.avatar || item.authorAvatarUrl || socialAvatarUrl(item.authorUrl),
      links: current?.links || (item.authorUrl ? [{ url: item.authorUrl, label: "X / Twitter" }] : []),
      tags,
      externalHref: externalEntityHref("author", displayName),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hant"));
}

/** Build organization identities for published external-script entries. */
export function externalOrgsFromScripts(items: ExternalPublicScript[]): PublicOrg[] {
  const map = new Map<string, PublicOrg>();
  for (const item of items) {
    const name = item.organizationName?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    const current = map.get(key);
    const tags = Array.from(new Set([...(current?.tags || []), ...(item.categories || [])]));
    map.set(key, {
      ...(current || {}),
      id: current?.id || `external-org:${name}`,
      name,
      website: current?.website || item.organizationUrl || undefined,
      logoUrl: current?.logoUrl || item.organizationAvatarUrl || socialAvatarUrl(item.organizationUrl),
      tags,
      externalHref: externalEntityHref("org", name),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

export function publicScriptsFromBundle(data: unknown): PublicScript[] {
  if (!data || typeof data !== "object") return [];
  const scripts = (data as { scripts?: unknown }).scripts;
  if (!Array.isArray(scripts)) return [];
  return scripts.filter((script): script is PublicScript => {
    return Boolean(script && typeof script === "object" && (script as { id?: unknown }).id);
  });
}

export function publicPersonasFromResponse(data: unknown): PublicPersona[] {
  return Array.isArray(data) ? (data as PublicPersona[]) : [];
}

export function publicOrgsFromResponse(data: unknown): PublicOrg[] {
  return Array.isArray(data) ? (data as PublicOrg[]) : [];
}
