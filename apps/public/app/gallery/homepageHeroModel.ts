/**
 * Homepage hero slide model.
 *
 * Brand slide is always first. Backend banner slides follow.
 * This keeps the GalleryClient hero pipeline unified through a single
 * PublicHeroMarquee instead of branching between StaticHero and carousel.
 */
import type { HeroSlide } from "@write/public-ui";

export interface BrandHeroSlide {
  type: "brand";
  id: "brand-intro";
  /** Accessible label for carousel aria and dot navigation */
  title: string;
}

export type HomepageHeroSlide = BrandHeroSlide | (HeroSlide & { type?: "image" });

export const BRAND_SLIDE: BrandHeroSlide = {
  type: "brand",
  id: "brand-intro",
  title: "探索、閱讀、分享創作台本",
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
  const banners = (bannerSlides ?? []).map((s) => ({ ...s, type: "image" as const }));
  if (!showBrandHero) return banners;
  return [BRAND_SLIDE, ...banners];
}
