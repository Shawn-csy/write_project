import { describe, expect, it } from "vitest";
import { parseBannerSlides } from "../gallery/bannerModel";

describe("parseBannerSlides", () => {
  it("returns undefined for null/missing banner", () => {
    expect(parseBannerSlides(null)).toBeUndefined();
    expect(parseBannerSlides(undefined)).toBeUndefined();
    expect(parseBannerSlides("string")).toBeUndefined();
  });

  it("returns undefined for empty/invalid items with no fallback fields", () => {
    expect(parseBannerSlides({ items: [] })).toBeUndefined();
    expect(parseBannerSlides({})).toBeUndefined();
  });

  it("parses imageUrl into image.url", () => {
    const slides = parseBannerSlides({
      items: [{ id: "s1", title: "T", imageUrl: "/media/a.webp" }],
    });
    expect(slides?.[0].image?.url).toBe("/media/a.webp");
    expect(slides?.[0].imageUrl).toBe("/media/a.webp");
  });

  it("preserves imageCrop as image.crop", () => {
    const crop = { cx: 0.2, cy: -0.1, zoom: 1 };
    const slides = parseBannerSlides({
      items: [{ id: "s1", title: "T", imageUrl: "/media/a.webp", imageCrop: crop }],
    });
    expect(slides?.[0].image?.crop).toEqual(crop);
  });

  it("preserves mobileCrop / desktopCrop / ultraWideCrop", () => {
    const mobile = { cx: -0.5, cy: 0.0, zoom: 1 };
    const desktop = { cx: 0.1, cy: 0.2, zoom: 1 };
    const ultrawide = { cx: 0.3, cy: 0.0, zoom: 1 };
    const slides = parseBannerSlides({
      items: [{
        id: "s1",
        title: "T",
        imageUrl: "/media/a.webp",
        imageMobileCrop: mobile,
        imageDesktopCrop: desktop,
        imageUltraWideCrop: ultrawide,
      }],
    });
    expect(slides?.[0].image?.mobileCrop).toEqual(mobile);
    expect(slides?.[0].image?.desktopCrop).toEqual(desktop);
    expect(slides?.[0].image?.ultraWideCrop).toEqual(ultrawide);
  });

  it("preserves backgroundMode blur-fill", () => {
    const slides = parseBannerSlides({
      items: [{ id: "s1", title: "T", imageUrl: "/media/a.webp", imageBackgroundMode: "blur-fill" }],
    });
    expect(slides?.[0].image?.backgroundMode).toBe("blur-fill");
  });

  it("does not set backgroundMode for unknown values", () => {
    const slides = parseBannerSlides({
      items: [{ id: "s1", title: "T", imageUrl: "/media/a.webp", imageBackgroundMode: "unknown" }],
    });
    expect(slides?.[0].image?.backgroundMode).toBeUndefined();
  });

  it("preserves imageAlt as image.alt", () => {
    const slides = parseBannerSlides({
      items: [{ id: "s1", title: "T", imageUrl: "/media/a.webp", imageAlt: "Custom alt" }],
    });
    expect(slides?.[0].image?.alt).toBe("Custom alt");
  });

  it("does not set image when imageUrl is absent", () => {
    const slides = parseBannerSlides({
      items: [{ id: "s1", title: "Only text" }],
    });
    expect(slides?.[0].image).toBeUndefined();
  });

  it("falls through to single-object form when no items", () => {
    const slides = parseBannerSlides({
      title: "Root",
      imageUrl: "/media/root.webp",
      imageMobileCrop: { cx: 0.1, cy: 0.1, zoom: 1 },
    });
    expect(slides?.[0].image?.url).toBe("/media/root.webp");
    expect(slides?.[0].image?.mobileCrop).toEqual({ cx: 0.1, cy: 0.1, zoom: 1 });
  });
});
