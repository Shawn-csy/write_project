/**
 * refreshDiff — pure helpers for client-refresh no-op detection.
 *
 * Prevents calling setState when the refreshed data is equivalent to what
 * the SSR already delivered, avoiding unnecessary re-renders and flicker.
 *
 * Both signatures include timestamp fields (lastModified / updatedAt) AND
 * explicitly enumerate every public render-relevant field. Refresh correctness
 * does not rely solely on the backend bumping timestamps — the signature detects
 * any change to a displayed field regardless of timestamp discipline.
 */

import type { PublicScript } from "./types";
import type { HeroSlide } from "@write/public-ui";

/**
 * Stable refresh signature for a single PublicScript.
 * Covers every field that affects homepage card rendering, hover preview,
 * series cards, author/license badges, or filter model inputs.
 */
function publicScriptRefreshSignature(s: PublicScript): string {
  return JSON.stringify([
    // identity + timestamps
    s.id,
    s.title,
    s.lastModified ?? s.updatedAt,
    // display presentation
    s.synopsis,
    s.outline,
    s.coverUrl,
    s.coverCrop ? [s.coverCrop.cx, s.coverCrop.cy, s.coverCrop.zoom] : null,
    s.coverDesign ?? null,
    s.contentLength,
    // tags
    s.tags?.map((t) => t.name).join(","),
    // series
    s.seriesId,
    s.seriesOrder,
    s.series?.id,
    s.series?.name,
    s.series?.summary,
    s.series?.coverUrl,
    // views / engagement
    s.views,
    s.likes,
    // license + badges
    s.license,
    s.licenseSpecialTerms,
    s.licenseCommercial,
    s.licenseDerivative,
    s.licenseNotify,
    s.targetAudience,
    s.contentRating,
    // author display
    s.authorDisplayMode,
    s.authorOverrideName,
    // owner (fallback author)
    s.owner?.id,
    s.owner?.displayName,
    s.owner?.avatar ?? s.owner?.avatarUrl,
    // persona
    s.persona?.id,
    s.persona?.displayName,
    s.persona?.avatar,
    s.persona?.defaultLicenseCommercial,
    s.persona?.defaultLicenseDerivative,
    s.persona?.defaultLicenseNotify,
    // organization
    s.organization?.id,
    s.organization?.name,
    s.organization?.logoUrl,
    // activity
    s.activityName,
    // custom metadata (hover preview / card summary)
    s.customMetadata ? JSON.stringify(s.customMetadata) : null,
  ]);
}

/**
 * Stable refresh signature for a single HeroSlide.
 * Covers all fields that affect rendering: text, link, image url (both current
 * and legacy imageUrl fallback), alt, all crop variants, backgroundMode,
 * gradient classes, overlay opacity, and background policy.
 */
function heroSlideRefreshSignature(slide: HeroSlide): string {
  const img = slide.image;
  return JSON.stringify([
    slide.id,
    slide.title,
    slide.subtitle,
    slide.content,
    slide.link,
    slide.className,
    slide.background,
    slide.overlayOpacity,
    // legacy fallback used by PublicHeroMarquee when image.url is absent
    slide.imageUrl,
    img?.url,
    img?.alt,
    img?.backgroundMode,
    img?.crop ? [img.crop.cx, img.crop.cy, img.crop.zoom] : null,
    img?.mobileCrop ? [img.mobileCrop.cx, img.mobileCrop.cy, img.mobileCrop.zoom] : null,
    img?.desktopCrop ? [img.desktopCrop.cx, img.desktopCrop.cy, img.desktopCrop.zoom] : null,
    img?.ultraWideCrop ? [img.ultraWideCrop.cx, img.ultraWideCrop.cy, img.ultraWideCrop.zoom] : null,
  ]);
}

export function arePublicScriptsEquivalent(
  a: PublicScript[],
  b: PublicScript[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (publicScriptRefreshSignature(a[i]) !== publicScriptRefreshSignature(b[i])) return false;
  }
  return true;
}

export function areHeroSlidesEquivalent(
  a: HeroSlide[] | undefined,
  b: HeroSlide[] | undefined
): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (heroSlideRefreshSignature(a[i]) !== heroSlideRefreshSignature(b[i])) return false;
  }
  return true;
}
