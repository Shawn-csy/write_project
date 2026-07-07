/**
 * Pure projection module for public entity pages (author / organization).
 *
 * Responsibilities:
 * - Build page model from API shapes.
 * - Keep profileTags (persona/org identity) strictly separate from workTags
 *   (aggregated script content tags).
 * - Keep image fields explicit — no cross-entity fallback.
 * - Owner fallback is never treated as author-page identity.
 */

import type { PublicPersona, PublicOrg, PublicScript } from "./types";

export type PublicEntityKind = "author" | "organization";

export interface PublicEntityImageModel {
  bannerUrl?: string;
  bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  avatarUrl?: string;
  avatarCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  logoUrl?: string;
  logoCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
}

export interface PublicEntityProfileModel {
  kind: PublicEntityKind;
  id: string;
  name: string;
  description?: string;
  website?: string;
  image: PublicEntityImageModel;
  /** Tags configured on the profile itself — author/org identity, not content tags. */
  profileTags: string[];
  /** Tags aggregated from public scripts on this page — content tags, not profile identity. */
  workTags: string[];
  scripts: PublicScript[];
}

/** Derive unique ordered work tags from scripts, excluding profile tags. */
function deriveWorkTags(scripts: PublicScript[], profileTags: string[]): string[] {
  const profileSet = new Set(profileTags.map((t) => t.toLowerCase()));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of scripts) {
    for (const tag of s.tags ?? []) {
      const key = tag.name.toLowerCase();
      if (!profileSet.has(key) && !seen.has(key)) {
        seen.add(key);
        result.push(tag.name);
      }
    }
  }
  return result;
}

export function buildAuthorEntityModel(
  persona: PublicPersona & {
    bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
    avatarCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  },
  scripts: PublicScript[]
): PublicEntityProfileModel {
  const profileTags = persona.tags ?? [];
  return {
    kind: "author",
    id: persona.id,
    name: persona.displayName,
    description: persona.bio,
    website: persona.website,
    image: {
      bannerUrl: persona.bannerUrl,
      bannerCrop: persona.bannerCrop,
      avatarUrl: persona.avatar,
      avatarCrop: persona.avatarCrop,
    },
    profileTags,
    workTags: deriveWorkTags(scripts, profileTags),
    scripts,
  };
}

export function buildOrgEntityModel(
  org: PublicOrg & {
    bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
    logoCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  },
  scripts: PublicScript[]
): PublicEntityProfileModel {
  const profileTags = org.tags ?? [];
  return {
    kind: "organization",
    id: org.id,
    name: org.name,
    description: org.description,
    website: org.website,
    image: {
      bannerUrl: org.bannerUrl,
      bannerCrop: org.bannerCrop,
      logoUrl: org.logoUrl,
      logoCrop: org.logoCrop,
    },
    profileTags,
    workTags: deriveWorkTags(scripts, profileTags),
    scripts,
  };
}
