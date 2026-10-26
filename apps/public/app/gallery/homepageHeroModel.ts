/**
 * Homepage hero slide model.
 *
 * Brand slide is always first. Backend banner slides follow.
 * This keeps the GalleryClient hero pipeline unified through a single
 * PublicHeroMarquee instead of branching between StaticHero and carousel.
 */
import type { HeroSlide, HeroSlideBackground } from "@write/public-ui";

export interface BrandHeroSlide {
  type: "brand";
  id: "brand-intro";
  /** Accessible label for carousel aria and dot navigation */
  title: string;
  eyebrow: string;
  content: string;
  link?: string;
  /**
   * Tells PublicHeroMarquee to suppress its default banner gradient.
   * GalleryBrandHeroSlide renders its own full-bleed background.
   */
  background: HeroSlideBackground;
}

export type HomepageHeroSlide = BrandHeroSlide | (HeroSlide & { type?: "image" });

export const BRAND_SLIDE: BrandHeroSlide = {
  type: "brand",
  id: "brand-intro",
  eyebrow: "公開台本平台",
  title: "配音、閱讀、創作公開台本",
  content: "僅收錄公開台本，如果有喜歡的歡迎委託台本師\n如果需要上架或下架作品請直接與我們聯繫。",
  background: "none",
};

/**
 * Build the final slide array for the homepage hero.
 *
 * @param bannerSlides - Backend banner slides to append after brand slide.
 * @param showBrandHero - When false, omits the brand slide entirely.
 *   Controlled by superadmin/backend homepage config.
 *   Defaults to true so the brand hero appears when no preference is set.
 */
export function buildHomepageHeroSlides(
  bannerSlides?: HeroSlide[],
  showBrandHero = true,
): HomepageHeroSlide[] {
  const configuredBrand = (bannerSlides ?? []).find((slide) => String(slide.id) === "brand-intro");
  const banners = (bannerSlides ?? [])
    .filter((slide) => String(slide.id) !== "brand-intro")
    .map((s) => ({ ...s, type: "image" as const }));
  const brand: BrandHeroSlide = configuredBrand
    ? {
        ...BRAND_SLIDE,
        eyebrow: configuredBrand.eyebrow?.trim() || BRAND_SLIDE.eyebrow,
        title: configuredBrand.title?.trim() || BRAND_SLIDE.title,
        content: configuredBrand.content?.trim() || BRAND_SLIDE.content,
        ...(configuredBrand.link?.trim() ? { link: configuredBrand.link.trim() } : {}),
      }
    : BRAND_SLIDE;
  if (!showBrandHero) return banners;
  return [brand, ...banners];
}
