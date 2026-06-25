/**
 * Pure banner conversion helpers — no React, server-safe.
 */
import type { MediaCropLike } from "@write/media-crop";

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

/**
 * Controls the carousel frame background behind a slide.
 * - "default": applies the standard banner gradient (from-/via-/to- colors).
 * - "none":    no gradient; frame is bg-background. Use when the slide injects
 *              its own full-bleed background via renderSlideContent.
 */
export type HeroSlideBackground = "default" | "none";

export interface HeroSlide {
  id?: string | number;
  title?: string;
  subtitle?: string;
  content?: string;
  /** Per-slide Tailwind gradient classes. Only used when background === "default". */
  className?: string;
  /**
   * Frame background policy. Defaults to "default" (banner gradient).
   * Set to "none" when the slide renders its own full-bleed background.
   */
  background?: HeroSlideBackground;
  link?: string;
  /**
   * Structured image data with optional art-direction crops per viewport.
   * Host apps inject a preset-aware renderer via PublicHeroMarqueeProps.renderImage.
   * Preferred over the legacy imageUrl field.
   *
   * Crop resolution order (most specific wins):
   *   mobile viewport      → mobileCrop ?? crop
   *   desktop viewport     → desktopCrop ?? crop
   *   ultra-wide viewport  → ultraWideCrop ?? desktopCrop ?? crop
   *
   * backgroundMode "blur-fill": host renderer should render a blurred enlarged
   * background layer beneath the primary image to fill edge areas on ultra-wide
   * displays. The primary image still uses its placement crop.
   */
  image?: {
    url: string;
    alt?: string;
    /** Generic focal crop — fallback when no viewport-specific crop is set. */
    crop?: MediaCropLike | null;
    mobileCrop?: MediaCropLike | null;
    desktopCrop?: MediaCropLike | null;
    ultraWideCrop?: MediaCropLike | null;
    backgroundMode?: "cover" | "blur-fill";
  };
  /** @deprecated Use image.url instead. Kept for backwards compatibility. */
  imageUrl?: string;
  /** 0-100. Undefined = auto (show overlay only when text present). 0 = no overlay. */
  overlayOpacity?: number;
}

/** Parse all hero image placement fields from a raw banner item. */
function parseHeroImage(raw: Record<string, unknown>): HeroSlide["image"] | undefined {
  const url = raw.imageUrl as string | undefined;
  if (!url) return undefined;
  const crop = (raw.imageCrop ?? null) as MediaCropLike | null;
  const mobileCrop = (raw.imageMobileCrop ?? null) as MediaCropLike | null;
  const desktopCrop = (raw.imageDesktopCrop ?? null) as MediaCropLike | null;
  const ultraWideCrop = (raw.imageUltraWideCrop ?? null) as MediaCropLike | null;
  const alt = raw.imageAlt as string | undefined;
  const backgroundMode = raw.imageBackgroundMode === "blur-fill" ? "blur-fill" : undefined;
  return {
    url,
    ...(alt ? { alt } : {}),
    ...(crop ? { crop } : {}),
    ...(mobileCrop ? { mobileCrop } : {}),
    ...(desktopCrop ? { desktopCrop } : {}),
    ...(ultraWideCrop ? { ultraWideCrop } : {}),
    ...(backgroundMode ? { backgroundMode } : {}),
  };
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
    return valid.map((item, idx) => {
      const image = parseHeroImage(item);
      return {
        id: (item.id as string | undefined) ?? `banner-${idx + 1}`,
        title: item.title as string | undefined,
        subtitle: item.content as string | undefined,
        link: item.link as string | undefined,
        imageUrl: item.imageUrl as string | undefined,
        ...(image ? { image } : {}),
      };
    });
  }
  if (b.title || b.content || b.link || b.imageUrl) {
    const image = parseHeroImage(b);
    return [{
      id: "banner-0",
      title: b.title as string | undefined,
      subtitle: b.content as string | undefined,
      link: b.link as string | undefined,
      imageUrl: b.imageUrl as string | undefined,
      ...(image ? { image } : {}),
    }];
  }
  return undefined;
}
