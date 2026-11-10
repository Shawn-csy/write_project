import { formatPublicCardDate } from "@write/public-ui/public-date";
import type {
  AuthorLike,
  GalleryScriptInput,
  OrgLike,
} from "@write/public-ui";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "./types";
import { externalEntityHref, socialAvatarUrl } from "./externalEntity";
import { externalCoverSrc } from "./externalCover";

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

export function toGalleryInput(script: PublicScript): GalleryScriptInput {
  const displayDate = formatPublicCardDate(getPublicScriptPublishedTimestamp(script));
  const hasCustomAuthor =
    String(script.authorDisplayMode || "").trim().toLowerCase() === "override" ||
    Boolean(String(script.authorOverrideName || "").trim());
  return {
    id: script.id,
    hasDemo: Boolean(script.hasDemo || hasValidDemoLink(script.activityDemoLinks)),
    title: script.title,
    synopsis: script.synopsis ?? undefined,
    outline: script.outline ?? undefined,
    coverUrl: script.coverUrl ?? undefined,
    coverCrop: script.coverCrop ?? undefined,
    coverDesign: script.coverDesign ?? undefined,
    tags: (script.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
    views: script.views,
    contentLength: script.contentLength,
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
  };
}

export function hasValidDemoLink(value: unknown): boolean {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); }
    catch { return /^https?:\/\//i.test(String(value).trim()); }
  }
  return Array.isArray(parsed) && parsed.some((item) => item && typeof item === "object" && /^https?:\/\//i.test(String(item.url || item.link || "").trim()));
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
    const key = item.externalAuthorId || item.authorKey || item.authorProfileKey || displayName.normalize("NFKC").toLocaleLowerCase();
    const current = map.get(key);
    const tags = Array.from(new Set([...(current?.tags || []), ...(item.categories || [])]));
    const supplement = item.authorSupplement || {};
    const supplementalLinks = Array.isArray(supplement.links) ? supplement.links : [];
    const fallbackLink = item.authorUrl ? [{ url: item.authorUrl, label: "X / Twitter" }] : [];
    const currentLinks = Array.isArray(current?.links) ? current.links : [];
    const mergedLinks = [...currentLinks, ...fallbackLink, ...supplementalLinks]
      .filter((link, index, all) => Boolean(link.url) && all.findIndex((candidate) => candidate.url === link.url) === index);
    map.set(key, {
      ...(current || {}),
      id: current?.id || `external-author:${key}`,
      displayName,
      bio: current?.bio || item.authorBio || undefined,
      website: current?.website || supplement.website || item.authorUrl || undefined,
      avatar: current?.avatar || item.authorAvatarUrl || socialAvatarUrl(item.authorUrl),
      links: mergedLinks,
      tags,
      externalHref: item.authorPersonaId ? `/author/${encodeURIComponent(item.authorPersonaId)}` : externalEntityHref("author", displayName, item.authorUrl),
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
      description: current?.description || item.organizationBio || undefined,
      website: current?.website || item.organizationUrl || undefined,
      logoUrl: current?.logoUrl || item.organizationAvatarUrl || socialAvatarUrl(item.organizationUrl),
      tags,
      externalHref: externalEntityHref("org", name, item.organizationUrl),
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

// ── Homepage payload slimming ────────────────────────────────────────────────
//
// The homepage hands its script lists to a client component, so every field is
// serialized twice (once as HTML, once in the RSC payload). The public bundle
// carries reader-only data (marker themes alone were ~28 KB) and admin
// bookkeeping the gallery never reads. Strip it on the server.

// Generous ceilings: they only exist to cap outliers, not to shorten normal text.
const HOMEPAGE_EXTERNAL_SUMMARY_MAX = 600;
const HOMEPAGE_EXTERNAL_BIO_MAX = 500;

function clip(value: string | undefined, max: number): string | undefined {
  if (!value) return value;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function slimScriptForHomepage(script: PublicScript): PublicScript {
  return {
    id: script.id,
    title: script.title,
    hasDemo: Boolean(script.hasDemo || hasValidDemoLink(script.activityDemoLinks)),
    synopsis: script.synopsis,
    outline: script.outline,
    coverUrl: script.coverUrl,
    coverCrop: script.coverCrop,
    coverDesign: script.coverDesign,
    tags: script.tags?.map(({ id, name }) => ({ id, name })),
    views: script.views,
    contentLength: script.contentLength,
    createdAt: script.createdAt,
    draftDate: script.draftDate,
    lastModified: script.lastModified,
    updatedAt: script.updatedAt,
    seriesOrder: script.seriesOrder,
    series: script.series && {
      id: script.series.id,
      name: script.series.name,
      summary: script.series.summary,
      coverUrl: script.series.coverUrl,
    },
    targetAudience: script.targetAudience,
    contentRating: script.contentRating,
    license: script.license,
    licenseSpecialTerms: script.licenseSpecialTerms,
    licenseCommercial: script.licenseCommercial,
    licenseDerivative: script.licenseDerivative,
    licenseNotify: script.licenseNotify,
    authorDisplayMode: script.authorDisplayMode,
    authorOverrideName: script.authorOverrideName,
    owner: script.owner && {
      id: script.owner.id,
      displayName: script.owner.displayName,
      avatar: script.owner.avatar,
      avatarUrl: script.owner.avatarUrl,
    },
    persona: script.persona && {
      id: script.persona.id,
      displayName: script.persona.displayName,
      avatar: script.persona.avatar,
      defaultLicenseCommercial: script.persona.defaultLicenseCommercial,
      defaultLicenseDerivative: script.persona.defaultLicenseDerivative,
      defaultLicenseNotify: script.persona.defaultLicenseNotify,
    },
    organization: script.organization && {
      name: script.organization.name,
      logoUrl: script.organization.logoUrl,
    },
  };
}

export function slimExternalScriptForHomepage(item: ExternalPublicScript): ExternalPublicScript {
  return {
    id: item.id,
    sourceUrl: item.sourceUrl,
    sourceDomain: item.sourceDomain,
    sourceName: item.sourceName,
    authorName: item.authorName,
    authorKey: item.authorKey,
    externalAuthorId: item.externalAuthorId,
    authorPersonaId: item.authorPersonaId,
    authorProfileKey: item.authorProfileKey,
    authorBio: clip(item.authorBio, HOMEPAGE_EXTERNAL_BIO_MAX),
    authorUrl: item.authorUrl,
    authorAvatarUrl: item.authorAvatarUrl,
    organizationName: item.organizationName,
    organizationBio: clip(item.organizationBio, HOMEPAGE_EXTERNAL_BIO_MAX),
    organizationUrl: item.organizationUrl,
    organizationAvatarUrl: item.organizationAvatarUrl,
    seriesName: item.seriesName,
    seriesOrder: item.seriesOrder,
    demoLinks: item.demoLinks,
    hasDemo: Boolean(item.hasDemo || hasValidDemoLink(item.demoLinks)),
    // Consumers read `title || remoteTitle` and `summary || remoteSummary`;
    // fold the fallback in so the second copy does not ship.
    title: item.title || item.remoteTitle || "",
    summary: clip(item.summary || item.remoteSummary, HOMEPAGE_EXTERNAL_SUMMARY_MAX),
    // Cards resolve the image from this with externalCoverSrc(): the stored file in the static
    // build, otherwise the /api/public-media/external/:id proxy.
    coverUrl: externalCoverSrc(item),
    categories: item.categories,
    views: item.views,
    status: item.status,
    sortOrder: item.sortOrder,
    sourceCreatedAt: item.sourceCreatedAt,
    sourceModifiedAt: item.sourceModifiedAt,
    createdAt: item.createdAt,
    mountedAt: item.mountedAt,
    updatedAt: item.updatedAt,
  };
}
