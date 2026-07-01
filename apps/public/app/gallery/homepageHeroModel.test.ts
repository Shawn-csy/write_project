import { describe, expect, it } from "vitest";
import { buildHomepageHeroSlides, BRAND_SLIDE } from "./homepageHeroModel";

const banners = [
  { id: "b1", title: "Banner A" },
  { id: "b2", title: "Banner B" },
];

describe("buildHomepageHeroSlides", () => {
  it("returns only brand slide when no banner slides", () => {
    const slides = buildHomepageHeroSlides();
    expect(slides).toHaveLength(1);
    expect(slides[0]).toEqual(BRAND_SLIDE);
  });

  it("returns only brand slide for empty array", () => {
    const slides = buildHomepageHeroSlides([]);
    expect(slides).toHaveLength(1);
    expect(slides[0].type).toBe("brand");
  });

  it("brand slide is always first", () => {
    const slides = buildHomepageHeroSlides(banners);
    expect(slides[0].type).toBe("brand");
    expect(slides[0].id).toBe("brand-intro");
  });

  it("brand slide has title for aria/analytics", () => {
    const slides = buildHomepageHeroSlides();
    expect((slides[0] as { title?: string }).title).toBeTruthy();
  });

  it("banner slides are appended after brand", () => {
    const slides = buildHomepageHeroSlides(banners);
    expect(slides).toHaveLength(3);
    expect(slides[1].id).toBe("b1");
    expect(slides[2].id).toBe("b2");
  });

  it("banner slides get type=image", () => {
    const slides = buildHomepageHeroSlides(banners);
    expect((slides[1] as { type?: string }).type).toBe("image");
  });

  it("showBrandHero=false omits brand slide", () => {
    const slides = buildHomepageHeroSlides(banners, false);
    expect(slides).toHaveLength(2);
    expect(slides.every((s) => (s as { type?: string }).type !== "brand")).toBe(true);
  });

  it("showBrandHero=false with no banners returns empty array", () => {
    const slides = buildHomepageHeroSlides([], false);
    expect(slides).toHaveLength(0);
  });

  it("showBrandHero=true (default) always includes brand slide", () => {
    expect(buildHomepageHeroSlides(banners, true)[0].type).toBe("brand");
    expect(buildHomepageHeroSlides(undefined, true)[0].type).toBe("brand");
  });
});
