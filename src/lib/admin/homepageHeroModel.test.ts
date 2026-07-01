import { describe, expect, it } from "vitest";
import {
  buildHomepageHeroPlacementModel,
  buildHomepageHeroPreviewFrames,
  isHomepageHeroPlacementReady,
  resolveHeroCropForViewport,
  resolveHeroPreviewImageStyle,
  validateHomepageHeroPlacement,
} from "./homepageHeroModel";
import type { HomepageBannerItem } from "../../types/api";

const BASE_ITEM: HomepageBannerItem = {
  id: "s1",
  title: "Banner",
  imageUrl: "/media/hero.webp",
  imageBackgroundMode: "cover",
};

const CROP_A = { cx: 0.1, cy: -0.2, zoom: 1.5 };
const CROP_B = { cx: -0.3, cy: 0.0, zoom: 1.0 };
const CROP_C = { cx: 0.2, cy: 0.1, zoom: 1.2 };

describe("buildHomepageHeroPlacementModel", () => {
  it("maps basic fields", () => {
    const m = buildHomepageHeroPlacementModel(BASE_ITEM);
    expect(m.id).toBe("s1");
    expect(m.title).toBe("Banner");
    expect(m.imageUrl).toBe("/media/hero.webp");
    expect(m.backgroundMode).toBe("cover");
  });

  it("normalizes missing optional fields to empty/null", () => {
    const m = buildHomepageHeroPlacementModel({ id: "x", title: "T" });
    expect(m.imageUrl).toBe("");
    expect(m.imageAlt).toBe("");
    expect(m.backgroundMode).toBeUndefined();
    expect(m.crop).toBeNull();
    expect(m.mobileCrop).toBeNull();
    expect(m.desktopCrop).toBeNull();
    expect(m.ultraWideCrop).toBeNull();
  });

  it("maps all crop fields", () => {
    const item: HomepageBannerItem = {
      ...BASE_ITEM,
      imageCrop: CROP_A,
      imageMobileCrop: CROP_B,
      imageDesktopCrop: CROP_C,
      imageUltraWideCrop: { cx: 0.0, cy: 0.0, zoom: 1.0 },
    };
    const m = buildHomepageHeroPlacementModel(item);
    expect(m.crop).toEqual(CROP_A);
    expect(m.mobileCrop).toEqual(CROP_B);
    expect(m.desktopCrop).toEqual(CROP_C);
    expect(m.ultraWideCrop).toEqual({ cx: 0.0, cy: 0.0, zoom: 1.0 });
  });

  it("rejects unknown backgroundMode", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageBackgroundMode: "stretch" as never,
    });
    expect(m.backgroundMode).toBeUndefined();
  });

  it("maps blur-fill mode", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageBackgroundMode: "blur-fill",
    });
    expect(m.backgroundMode).toBe("blur-fill");
  });

  it("maps imageAlt", () => {
    const m = buildHomepageHeroPlacementModel({ ...BASE_ITEM, imageAlt: "Alt text" });
    expect(m.imageAlt).toBe("Alt text");
  });
});

describe("resolveHeroCropForViewport", () => {
  it("mobile: mobileCrop preferred over crop", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM, imageCrop: CROP_A, imageMobileCrop: CROP_B,
    });
    expect(resolveHeroCropForViewport(m, "mobile")).toEqual(CROP_B);
  });

  it("mobile: falls back to crop when mobileCrop absent", () => {
    const m = buildHomepageHeroPlacementModel({ ...BASE_ITEM, imageCrop: CROP_A });
    expect(resolveHeroCropForViewport(m, "mobile")).toEqual(CROP_A);
  });

  it("desktop: desktopCrop preferred over crop", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM, imageCrop: CROP_A, imageDesktopCrop: CROP_C,
    });
    expect(resolveHeroCropForViewport(m, "desktop")).toEqual(CROP_C);
  });

  it("desktop: falls back to crop", () => {
    const m = buildHomepageHeroPlacementModel({ ...BASE_ITEM, imageCrop: CROP_A });
    expect(resolveHeroCropForViewport(m, "desktop")).toEqual(CROP_A);
  });

  it("ultra-wide: ultraWideCrop first", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageCrop: CROP_A,
      imageDesktopCrop: CROP_C,
      imageUltraWideCrop: CROP_B,
    });
    expect(resolveHeroCropForViewport(m, "ultra-wide")).toEqual(CROP_B);
  });

  it("ultra-wide: falls back to desktopCrop", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM, imageCrop: CROP_A, imageDesktopCrop: CROP_C,
    });
    expect(resolveHeroCropForViewport(m, "ultra-wide")).toEqual(CROP_C);
  });

  it("ultra-wide: falls back to crop when both absent", () => {
    const m = buildHomepageHeroPlacementModel({ ...BASE_ITEM, imageCrop: CROP_A });
    expect(resolveHeroCropForViewport(m, "ultra-wide")).toEqual(CROP_A);
  });

  it("returns null when all crops absent", () => {
    const m = buildHomepageHeroPlacementModel({ id: "x", title: "T" });
    expect(resolveHeroCropForViewport(m, "mobile")).toBeNull();
    expect(resolveHeroCropForViewport(m, "desktop")).toBeNull();
    expect(resolveHeroCropForViewport(m, "ultra-wide")).toBeNull();
  });
});

describe("buildHomepageHeroPreviewFrames", () => {
  it("returns three frames with correct viewports", () => {
    const m = buildHomepageHeroPlacementModel(BASE_ITEM);
    const frames = buildHomepageHeroPreviewFrames(m);
    expect(frames.map((f) => f.viewport)).toEqual(["mobile", "desktop", "ultra-wide"]);
  });

  it("frame sizes match spec", () => {
    const m = buildHomepageHeroPlacementModel(BASE_ITEM);
    const frames = buildHomepageHeroPreviewFrames(m);
    expect(frames[0]).toMatchObject({ viewport: "mobile", width: 390, height: 220 });
    expect(frames[1]).toMatchObject({ viewport: "desktop", width: 1440, height: 450 });
    expect(frames[2]).toMatchObject({ viewport: "ultra-wide", width: 2560, height: 800 });
  });

  it("effectiveCrop follows resolution order", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageCrop: CROP_A,
      imageMobileCrop: CROP_B,
      imageUltraWideCrop: CROP_C,
    });
    const frames = buildHomepageHeroPreviewFrames(m);
    expect(frames.find((f) => f.viewport === "mobile")?.effectiveCrop).toEqual(CROP_B);
    expect(frames.find((f) => f.viewport === "desktop")?.effectiveCrop).toEqual(CROP_A);
    expect(frames.find((f) => f.viewport === "ultra-wide")?.effectiveCrop).toEqual(CROP_C);
  });
});

describe("validateHomepageHeroPlacement", () => {
  it("no issues for a fully configured slide", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageAlt: "Alt",
      imageUltraWideCrop: CROP_A,
    });
    expect(validateHomepageHeroPlacement(m)).toHaveLength(0);
  });

  it("error: missing imageUrl", () => {
    const m = buildHomepageHeroPlacementModel({ id: "x", title: "T", imageBackgroundMode: "cover" });
    const issues = validateHomepageHeroPlacement(m);
    expect(issues.some((i) => i.code === "missing_image_url" && i.severity === "error")).toBe(true);
  });

  it("error: missing backgroundMode", () => {
    const m = buildHomepageHeroPlacementModel({ ...BASE_ITEM, imageBackgroundMode: undefined });
    const issues = validateHomepageHeroPlacement(m);
    expect(issues.some((i) => i.code === "missing_background_mode" && i.severity === "error")).toBe(true);
  });

  it("warning: cover mode without ultraWideCrop", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageBackgroundMode: "cover",
      imageAlt: "Alt",
    });
    const issues = validateHomepageHeroPlacement(m);
    expect(issues.some((i) => i.code === "missing_ultra_wide_crop_for_cover" && i.severity === "warning")).toBe(true);
  });

  it("no ultra-wide warning for blur-fill mode", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageBackgroundMode: "blur-fill",
      imageAlt: "Alt",
    });
    const issues = validateHomepageHeroPlacement(m);
    expect(issues.some((i) => i.code === "missing_ultra_wide_crop_for_cover")).toBe(false);
  });

  it("warning: missing imageAlt when imageUrl present", () => {
    const m = buildHomepageHeroPlacementModel({ ...BASE_ITEM, imageUltraWideCrop: CROP_A });
    const issues = validateHomepageHeroPlacement(m);
    expect(issues.some((i) => i.code === "missing_image_alt" && i.severity === "warning")).toBe(true);
  });

  it("no alt warning when imageUrl is absent", () => {
    const m = buildHomepageHeroPlacementModel({ id: "x", title: "T", imageBackgroundMode: "cover" });
    const issues = validateHomepageHeroPlacement(m);
    expect(issues.some((i) => i.code === "missing_image_alt")).toBe(false);
  });

  it("warning: image slide with no title/content/link", () => {
    const m = buildHomepageHeroPlacementModel({
      id: "x",
      imageUrl: "/media/hero.webp",
      imageBackgroundMode: "cover",
      imageAlt: "Alt",
      imageUltraWideCrop: CROP_A,
    });
    const issues = validateHomepageHeroPlacement(m);
    expect(issues.some((i) => i.code === "no_content_context" && i.severity === "warning")).toBe(true);
  });

  it("no context warning when title present", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageAlt: "Alt",
      imageUltraWideCrop: CROP_A,
    });
    expect(validateHomepageHeroPlacement(m)).toHaveLength(0);
  });
});

describe("isHomepageHeroPlacementReady", () => {
  it("true for fully configured slide", () => {
    const m = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageAlt: "Alt",
      imageUltraWideCrop: CROP_A,
    });
    expect(isHomepageHeroPlacementReady(m)).toBe(true);
  });

  it("false when imageUrl missing (error)", () => {
    const m = buildHomepageHeroPlacementModel({ id: "x", title: "T", imageBackgroundMode: "cover" });
    expect(isHomepageHeroPlacementReady(m)).toBe(false);
  });

  it("false when backgroundMode missing (error)", () => {
    const m = buildHomepageHeroPlacementModel({ id: "x", title: "T", imageUrl: "/media/x.webp" });
    expect(isHomepageHeroPlacementReady(m)).toBe(false);
  });

  it("true despite warnings (warnings are non-blocking)", () => {
    // Missing ultra-wide crop + no alt → 2 warnings, 0 errors
    const m = buildHomepageHeroPlacementModel({ ...BASE_ITEM });
    expect(isHomepageHeroPlacementReady(m)).toBe(true);
  });
});

describe("resolveHeroPreviewImageStyle — cover mode", () => {
  it("no crop: returns empty style", () => {
    expect(resolveHeroPreviewImageStyle(null)).toEqual({});
  });

  it("crop at center: objectPosition 50% 50%", () => {
    const s = resolveHeroPreviewImageStyle({ cx: 0, cy: 0, zoom: 1 });
    expect(s.objectPosition).toBe("50.0% 50.0%");
    expect(s.transform).toBeUndefined();
  });

  it("crop top-left: objectPosition 0% 0%", () => {
    const s = resolveHeroPreviewImageStyle({ cx: -1, cy: -1, zoom: 1 });
    expect(s.objectPosition).toBe("0.0% 0.0%");
  });

  it("crop bottom-right: objectPosition 100% 100%", () => {
    const s = resolveHeroPreviewImageStyle({ cx: 1, cy: 1, zoom: 1 });
    expect(s.objectPosition).toBe("100.0% 100.0%");
  });

  it("zoom > 1: adds scale transform", () => {
    const s = resolveHeroPreviewImageStyle({ cx: 0, cy: 0, zoom: 1.5 });
    expect(s.transform).toBe("scale(1.5)");
    expect(s.transformOrigin).toBe("center center");
  });

  it("zoom <= 1: no transform", () => {
    const s = resolveHeroPreviewImageStyle({ cx: 0.2, cy: -0.3, zoom: 0.8 });
    expect(s.transform).toBeUndefined();
  });
});

describe("resolveHeroPreviewImageStyle — blur-fill background overscan", () => {
  it("overscanScale alone produces scale(N) transform", () => {
    const s = resolveHeroPreviewImageStyle({ cx: 0, cy: 0, zoom: 1 }, 1.4);
    expect(s.transform).toBe("scale(1.4)");
    expect(s.transformOrigin).toBe("center center");
  });

  it("overscanScale + crop zoom compose into single transform", () => {
    const s = resolveHeroPreviewImageStyle({ cx: 0.5, cy: -0.3, zoom: 2 }, 1.4);
    expect(s.transform).toBe("scale(1.4) scale(2)");
  });

  it("overscanScale without crop still applies scale", () => {
    const s = resolveHeroPreviewImageStyle(null, 1.4);
    expect(s.transform).toBe("scale(1.4)");
    expect(s.objectPosition).toBeUndefined();
  });

  it("overscanScale=1 is no-op", () => {
    const s = resolveHeroPreviewImageStyle({ cx: 0, cy: 0, zoom: 1 }, 1);
    expect(s.transform).toBeUndefined();
  });

  it("bg crop uses ultraWideCrop ?? desktopCrop ?? crop resolution", () => {
    // Mirrors HeroImage.tsx line 102 and admin preview bgCrop derivation.
    const model = buildHomepageHeroPlacementModel({
      ...BASE_ITEM,
      imageCrop: CROP_A,
      imageDesktopCrop: CROP_B,
      imageUltraWideCrop: CROP_C,
    });
    const bgCrop = model.ultraWideCrop ?? model.desktopCrop ?? model.crop;
    expect(bgCrop).toEqual(CROP_C);
    const s = resolveHeroPreviewImageStyle(bgCrop, 1.4);
    // CROP_C = { cx: 0.2, cy: 0.1, zoom: 1.2 }; zoom > 1 → composed transform
    expect(s.transform).toBe("scale(1.4) scale(1.2)");
  });
});
