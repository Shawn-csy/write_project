/**
 * Pure banner conversion helpers — no React, server-safe.
 */

/**
 * Placeholder slides for development / Storybook / test fixtures only.
 * Production code must never pass these to PublicHeroMarquee.
 * Missing backend banner data → no banner (return undefined from parseBannerSlides).
 */
export const DEV_PLACEHOLDER_SLIDES: readonly {
  id: string;
  title: string;
  subtitle: string;
  className: string;
}[] = [
  {
    id: "placeholder-1",
    title: "Marquee Placeholder A",
    subtitle: "可替換成活動宣傳圖、公告、主題企劃。",
    className:
      "from-[#e7f4ff] via-[#f2fbff] to-[#fff9f2] dark:from-[#16314b] dark:via-[#13313c] dark:to-[#3b2a1e]",
  },
  {
    id: "placeholder-2",
    title: "Marquee Placeholder B",
    subtitle: "可放最新上架、徵稿中、站內公告等資訊。",
    className:
      "from-[#f6f1ff] via-[#fff2f7] to-[#fff8e7] dark:from-[#2d1f4a] dark:via-[#3a2036] dark:to-[#3a2d18]",
  },
  {
    id: "placeholder-3",
    title: "Marquee Placeholder C",
    subtitle: "之後可接後台資料，改為可管理的輪播素材。",
    className:
      "from-[#e9fff7] via-[#edf9ff] to-[#f4f2ff] dark:from-[#133a33] dark:via-[#15303f] dark:to-[#2a2450]",
  },
] as const;

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
