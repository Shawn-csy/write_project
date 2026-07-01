import type {
  AuthorLike,
  GalleryScriptInput,
  OrgLike,
} from "@write/public-ui";
import type { PublicOrg, PublicPersona, PublicScript } from "./types";

export function toGalleryInput(script: PublicScript): GalleryScriptInput {
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
    lastModified: script.lastModified,
    updatedAt: script.updatedAt ?? undefined,
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
