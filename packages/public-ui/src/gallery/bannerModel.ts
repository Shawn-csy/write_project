/**
 * Pure banner conversion helpers — no React, server-safe.
 */

export interface HeroSlide {
  id?: string | number;
  title?: string;
  subtitle?: string;
  content?: string;
  className?: string;
  link?: string;
  imageUrl?: string;
  /** 0-100. Undefined = auto (show overlay only when text present). 0 = no overlay. */
  overlayOpacity?: number;
}

/**
 * Convert a raw API HomepageBanner payload (unknown shape) into HeroSlide[].
 * Single source of truth shared by Next.js server page and client re-fetch.
 */
export function parseBannerSlides(banner: unknown): HeroSlide[] | undefined {
  if (!banner || typeof banner !== "object") return undefined;
  const b = banner as Record<string, unknown>;
  const items = Array.isArray(b.items) ? (b.items as Record<string, unknown>[]) : [];
  const valid = items.filter((item) => item.title || item.content || item.link || item.imageUrl);
  if (valid.length > 0) {
    return valid.map((item, idx) => ({
      id: (item.id as string | undefined) ?? `banner-${idx + 1}`,
      title: item.title as string | undefined,
      subtitle: item.content as string | undefined,
      link: item.link as string | undefined,
      imageUrl: item.imageUrl as string | undefined,
    }));
  }
  if (b.title || b.content || b.link || b.imageUrl) {
    return [{
      id: "banner-0",
      title: b.title as string | undefined,
      subtitle: b.content as string | undefined,
      link: b.link as string | undefined,
      imageUrl: b.imageUrl as string | undefined,
    }];
  }
  return undefined;
}
