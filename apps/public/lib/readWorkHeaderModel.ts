/**
 * Pure model for the read-page work header.
 * Consumes a raw PublicScript + stats input and returns a stable,
 * typed model object. Components receive the model, not raw script props.
 */
import type { PublicScript } from "./types";
import { buildScriptOverlayProps } from "./scriptProjection";

// ── input type (decoupled from hook interface) ────────────────────────────

export interface ReadWorkHeaderStatsInput {
  views: number;
  likes: number;
  liked: boolean;
}

// ── sub-types re-exported for consumers ──────────────────────────────────

export interface ReadWorkHeaderAuthor {
  id?: string;
  displayName: string;
  isClickable: boolean;
  href: string | undefined;
}

export interface ReadWorkHeaderOrganization {
  id?: string;
  name: string;
  logoUrl?: string;
  href: string | undefined;
}

export interface ReadWorkHeaderSeries {
  name: string;
  href: string;
  order: number | undefined;
}

export interface ReadWorkHeaderModel {
  // identity
  title: string;
  synopsis: string | undefined;
  coverUrl: string | undefined;
  coverCrop: PublicScript["coverCrop"];
  coverDesign: PublicScript["coverDesign"];
  author: ReadWorkHeaderAuthor | null;
  organization: ReadWorkHeaderOrganization | null;
  series: ReadWorkHeaderSeries | null;

  // stats
  views: number;
  likes: number;
  isLiked: boolean;
  durationMinutes: number | undefined;
  dialogueChars: number | undefined;

  // tags
  tags: string[];

  // license / rating / audience
  license: string;
  commercialUse: string;
  derivativeUse: string;
  notifyOnModify: string;
  licenseSpecialTerms: string[];
  targetAudience: string;
  contentRating: string;

  // expandable details
  prefaceItems: ReturnType<typeof buildScriptOverlayProps>["prefaceItems"];
  demoLinks: ReturnType<typeof buildScriptOverlayProps>["demoLinks"];
  customFields: ReturnType<typeof buildScriptOverlayProps>["customFields"];
}

// ── non-linkable author id sentinels (from PublicScriptInfoOverlay) ───────

const NON_LINK_AUTHOR_IDS = new Set(["override-author", "header-author-fallback"]);

function isNonLinkAuthorId(id: string | undefined): boolean {
  return NON_LINK_AUTHOR_IDS.has(String(id ?? "").trim());
}

// ── builder ───────────────────────────────────────────────────────────────

export function buildReadWorkHeaderModel(
  script: PublicScript,
  stats: ReadWorkHeaderStatsInput,
): ReadWorkHeaderModel {
  const overlayProps = buildScriptOverlayProps(script);

  // author — only persona.id maps to /author/ route; owner fallback is plain text
  const authorDisplayName =
    script.persona?.displayName ?? script.owner?.displayName ?? "";
  const personaId = script.persona?.id;
  const authorIsClickable = Boolean(personaId) && !isNonLinkAuthorId(personaId);
  const author: ReadWorkHeaderAuthor | null = authorDisplayName
    ? {
        id: authorIsClickable ? personaId : undefined,
        displayName: authorDisplayName,
        isClickable: authorIsClickable,
        href: authorIsClickable ? `/author/${personaId}` : undefined,
      }
    : null;

  // organization
  const org = script.organization ?? null;
  const organization: ReadWorkHeaderOrganization | null = org?.name
    ? {
        id: org.id,
        name: org.name,
        logoUrl: org.logoUrl ?? undefined,
        href: org.id ? `/org/${org.id}` : undefined,
      }
    : null;

  // series
  const series: ReadWorkHeaderSeries | null = script.series?.name
    ? {
        name: script.series.name,
        href: `/series/${encodeURIComponent(script.series.name)}`,
        order: script.seriesOrder ?? undefined,
      }
    : null;

  // duration / dialogue estimate
  const contentLength =
    script.contentLength ?? (script.content?.length ?? 0);
  const durationMinutes =
    contentLength > 0 ? Math.round(contentLength / 2 / 200) : undefined;
  const dialogueChars =
    contentLength > 0 ? Math.round(contentLength / 2) : undefined;

  const tags = (script.tags ?? []).map((t) => t.name).filter(Boolean);

  const synopsisFallback = (script.synopsis ?? "").trim() || undefined;

  return {
    title: script.title,
    synopsis: synopsisFallback,
    coverUrl: script.coverUrl ?? undefined,
    coverCrop: script.coverCrop ?? null,
    coverDesign: script.coverDesign ?? null,
    author,
    organization,
    series,
    views: stats.views,
    likes: stats.likes,
    isLiked: stats.liked,
    durationMinutes,
    dialogueChars,
    tags,
    license: overlayProps.license,
    commercialUse: overlayProps.commercialUse,
    derivativeUse: overlayProps.derivativeUse,
    notifyOnModify: overlayProps.notifyOnModify,
    licenseSpecialTerms: overlayProps.licenseSpecialTerms,
    targetAudience: overlayProps.targetAudience,
    contentRating: overlayProps.contentRating,
    prefaceItems: overlayProps.prefaceItems,
    demoLinks: overlayProps.demoLinks,
    customFields: overlayProps.customFields,
  };
}
