/**
 * Pure builders for the series, tag and external author/organization pages.
 *
 * The server renders these pages from the public bundle at build time, and the
 * browser rebuilds them from a fresh bundle so edits show up without a
 * redeploy. Both must produce the same model, so the logic lives here.
 */

import { enrichScript, findSeriesGroupByName, groupScriptsIntoGalleryEntries } from "@write/public-ui/server";
import { filterExternalScriptsByTag, filterScriptsByTag } from "@/app/tag/[name]/filterScriptsByTag";
import { externalCoverSrc } from "./externalCover";
import { externalEntitySlug } from "./externalEntity";
import { toGalleryInput } from "./galleryProjection";
import type { ExternalPublicScript, PublicScript } from "./types";

export interface PublicBundleLike {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
}

export function decodeRouteName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function publishedExternalScripts(bundle: PublicBundleLike): ExternalPublicScript[] {
  return (bundle.externalPublicScripts ?? []).filter((item) => item.status === "published");
}

// ── Series ──────────────────────────────────────────────────────────────────

export interface SeriesData {
  scripts: PublicScript[];
  externalItems: ExternalPublicScript[];
  summary?: string;
  coverUrl?: string;
  latestScriptId?: string;
}

export function buildSeriesData(bundle: PublicBundleLike, seriesName: string): SeriesData {
  const rawScripts = bundle.scripts ?? [];
  const allEnriched = rawScripts.map((s) => enrichScript(toGalleryInput(s)));
  const entries = groupScriptsIntoGalleryEntries(allEnriched);
  const group = findSeriesGroupByName(entries, seriesName);
  const externalItems = (bundle.externalPublicScripts ?? [])
    .filter((item) => item.status === "published" && item.seriesName?.trim().toLocaleLowerCase() === seriesName.trim().toLocaleLowerCase())
    .sort((a, b) => {
      const aOrder = a.seriesOrder == null ? Number.POSITIVE_INFINITY : a.seriesOrder;
      const bOrder = b.seriesOrder == null ? Number.POSITIVE_INFINITY : b.seriesOrder;
      return aOrder - bOrder || (a.mountedAt ?? a.createdAt ?? 0) - (b.mountedAt ?? b.createdAt ?? 0);
    });
  if (!group && externalItems.length === 0) return { scripts: [], externalItems: [] };
  // Map sorted chapters back to PublicScript by id (preserving model order)
  const byId = new Map(rawScripts.map((s) => [s.id, s]));
  const scripts = (group?.scripts ?? [])
    .map((s) => byId.get(s.id))
    .filter((s): s is PublicScript => s != null);
  const externalCoverItem = externalItems.find((item) => item.coverUrl);
  return {
    scripts,
    externalItems,
    summary: group?.summary || externalItems.find((item) => item.summary)?.summary,
    coverUrl: group?.coverUrl || externalCoverSrc(externalCoverItem ?? { id: "" }),
    latestScriptId: group?.latestScript.id || externalItems.at(-1)?.id,
  };
}

// ── Tag ─────────────────────────────────────────────────────────────────────

export interface TagData {
  scripts: PublicScript[];
  externalScripts: ExternalPublicScript[];
}

export function buildTagData(bundle: PublicBundleLike, tagName: string): TagData {
  return {
    scripts: filterScriptsByTag(bundle.scripts ?? [], tagName),
    externalScripts: filterExternalScriptsByTag(publishedExternalScripts(bundle), tagName),
  };
}

// ── External author / organization ──────────────────────────────────────────

export interface ExternalEntityModel {
  name: string;
  bio: string;
  profileUrl: string;
  profileAvatarUrl: string;
  items: ExternalPublicScript[];
}

function normalizeAuthorAlias(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\p{Z}\s]/gu, "");
}

export function findExternalAuthorModel(published: ExternalPublicScript[], rawName: string): ExternalEntityModel | null {
  const name = decodeRouteName(rawName);
  const normalizedName = name.trim().toLocaleLowerCase();
  const matchesNameOrSlug = (item: ExternalPublicScript) => {
    const authorName = item.authorName?.trim() || "";
    return authorName.toLocaleLowerCase() === normalizedName
      || externalEntitySlug(authorName, item.authorUrl).toLocaleLowerCase() === normalizedName;
  };
  let items = published.filter(matchesNameOrSlug);

  // Older links used the external author's display name as the route token.
  // If punctuation changed and the loose name uniquely maps to one canonical
  // author slug, resolve that old URL and let the canonical redirect below fix it.
  const aliasKey = normalizeAuthorAlias(name.trim());
  if (items.length === 0 && aliasKey) {
    const aliasItems = published.filter(
      (item) => normalizeAuthorAlias(item.authorName?.trim() || "") === aliasKey,
    );
    const canonicalSlugs = new Set(
      aliasItems.map((item) => externalEntitySlug(item.authorName?.trim() || "", item.authorUrl)),
    );
    if (canonicalSlugs.size === 1) items = aliasItems;
  }

  if (items.length === 0) return null;
  return {
    name: items[0].authorName?.trim() || name,
    bio: items.find((item) => item.authorBio?.trim())?.authorBio?.trim() || "",
    profileUrl: items.find((item) => item.authorUrl)?.authorUrl || "",
    profileAvatarUrl: items.find((item) => item.authorAvatarUrl)?.authorAvatarUrl || "",
    items,
  };
}

export function findExternalOrgModel(published: ExternalPublicScript[], rawName: string): ExternalEntityModel | null {
  const name = decodeRouteName(rawName);
  const normalizedName = name.trim().toLocaleLowerCase();
  const items = published.filter((item) => {
    const organizationName = item.organizationName?.trim() || "";
    return organizationName.toLocaleLowerCase() === normalizedName
      || externalEntitySlug(organizationName, item.organizationUrl).toLocaleLowerCase() === normalizedName;
  });
  if (items.length === 0) return null;
  return {
    name: items[0].organizationName?.trim() || name,
    bio: items.find((item) => item.organizationBio?.trim())?.organizationBio?.trim() || "",
    profileUrl: items.find((item) => item.organizationUrl)?.organizationUrl || "",
    profileAvatarUrl: items.find((item) => item.organizationAvatarUrl)?.organizationAvatarUrl || "",
    items,
  };
}
