import { BRAND_SLIDE, type BrandHeroSlide } from "./homepageHeroModel";

/**
 * Brand slide inside the banner carousel: a plain brand-colour panel with the
 * site line and the current notice. The carousel container owns dimensions.
 */
export function GalleryBrandHeroSlide({ slide, duplicate = false }: { slide?: BrandHeroSlide; duplicate?: boolean }) {
  const Heading = duplicate ? "div" : "h1";
  const title = slide?.title || BRAND_SLIDE.title;
  return (
    <div className="absolute inset-0 overflow-hidden bg-band text-white" data-testid="brand-hero-slide">
      <div className="flex h-full flex-col justify-center px-3 py-2 sm:px-5 sm:py-3">
        <p className="text-[10px] leading-3 text-white/75 sm:text-xs sm:leading-4">{slide?.eyebrow || BRAND_SLIDE.eyebrow}</p>
        <Heading className="mt-0.5 text-sm font-bold leading-tight sm:mt-1 sm:text-xl">{title}</Heading>
        <p className="mt-1 whitespace-pre-line text-[10px] leading-[1.35] text-white/85 sm:mt-2 sm:text-xs sm:leading-normal">{slide?.content || BRAND_SLIDE.content}</p>
      </div>
    </div>
  );
}
