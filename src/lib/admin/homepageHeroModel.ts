/**
 * Pure model for homepage hero banner placement editing.
 *
 * No React, no API calls. Consumed by HomepageBannerSection UI and tests.
 *
 * Ownership:
 *   - Validation logic lives here, not in the UI component.
 *   - Public rendering logic lives in packages/public-ui/src/gallery/bannerModel.ts.
 *   - These two models must agree on the HeroSlide.image field contract.
 */
import type { HomepageBannerItem } from "../../types/api";
import type { MediaCropLike } from "@write/media-crop";

export type HeroBackgroundMode = "cover" | "blur-fill";

export type HeroIssueCode =
  | "missing_image_url"
  | "missing_background_mode"
  | "missing_ultra_wide_crop_for_cover"
  | "missing_image_alt"
  | "no_content_context";

export interface HeroPlacementIssue {
  code: HeroIssueCode;
  /** Warning (non-blocking) or error (blocks publish readiness). */
  severity: "warning" | "error";
  message: string;
}

export interface HeroPlacementModel {
  id: string;
  title: string;
  content: string;
  link: string;
  imageUrl: string;
  imageAlt: string;
  backgroundMode: HeroBackgroundMode | undefined;
  crop: MediaCropLike | null;
  mobileCrop: MediaCropLike | null;
  desktopCrop: MediaCropLike | null;
  ultraWideCrop: MediaCropLike | null;
}

export type HeroPreviewViewport = "mobile" | "desktop" | "ultra-wide";

export interface HeroPreviewFrame {
  viewport: HeroPreviewViewport;
  /** Logical px dimensions for the editor preview frame. */
  width: number;
  height: number;
  /** Crop to apply at this viewport, following the public resolution order. */
  effectiveCrop: MediaCropLike | null;
}

/**
 * Project a raw HomepageBannerItem into a normalized placement model.
 * Missing optional fields are normalized to empty string / null / undefined.
 */
export function buildHomepageHeroPlacementModel(
  item: HomepageBannerItem
): HeroPlacementModel {
  const mode = item.imageBackgroundMode;
  return {
    id: item.id,
    title: item.title ?? "",
    content: item.content ?? "",
    link: item.link ?? "",
    imageUrl: item.imageUrl ?? "",
    imageAlt: item.imageAlt ?? "",
    backgroundMode: mode === "cover" || mode === "blur-fill" ? mode : undefined,
    crop: item.imageCrop ?? null,
    mobileCrop: item.imageMobileCrop ?? null,
    desktopCrop: item.imageDesktopCrop ?? null,
    ultraWideCrop: item.imageUltraWideCrop ?? null,
  };
}

/**
 * Resolve the effective crop for a given viewport, following the public
 * renderer's resolution order:
 *   mobile      → mobileCrop ?? crop
 *   desktop     → desktopCrop ?? crop
 *   ultra-wide  → ultraWideCrop ?? desktopCrop ?? crop
 */
export function resolveHeroCropForViewport(
  model: HeroPlacementModel,
  viewport: HeroPreviewViewport
): MediaCropLike | null {
  switch (viewport) {
    case "mobile":
      return model.mobileCrop ?? model.crop;
    case "desktop":
      return model.desktopCrop ?? model.crop;
    case "ultra-wide":
      return model.ultraWideCrop ?? model.desktopCrop ?? model.crop;
  }
}

/** Editor preview frame sizes that cover the three failure classes. */
export function buildHomepageHeroPreviewFrames(
  model: HeroPlacementModel
): HeroPreviewFrame[] {
  const viewports: Array<{ viewport: HeroPreviewViewport; width: number; height: number }> = [
    { viewport: "mobile", width: 390, height: 220 },
    { viewport: "desktop", width: 1440, height: 450 },
    { viewport: "ultra-wide", width: 2560, height: 800 },
  ];
  return viewports.map(({ viewport, width, height }) => ({
    viewport,
    width,
    height,
    effectiveCrop: resolveHeroCropForViewport(model, viewport),
  }));
}

/**
 * Validate hero placement settings.
 * Returns all issues; UI decides which to display based on severity.
 */
export function validateHomepageHeroPlacement(
  model: HeroPlacementModel
): HeroPlacementIssue[] {
  const issues: HeroPlacementIssue[] = [];

  if (!model.imageUrl.trim()) {
    issues.push({
      code: "missing_image_url",
      severity: "error",
      message: "圖片 URL 為必填項目。",
    });
  }

  if (!model.backgroundMode) {
    issues.push({
      code: "missing_background_mode",
      severity: "error",
      message: "必須選擇顯示模式（裁切填滿 / 模糊補邊）。",
    });
  }

  if (model.backgroundMode === "cover" && !model.ultraWideCrop) {
    issues.push({
      code: "missing_ultra_wide_crop_for_cover",
      severity: "warning",
      message: "裁切填滿模式建議設定超寬裁切，否則超寬螢幕可能出現黑邊。",
    });
  }

  if (!model.imageAlt.trim() && model.imageUrl.trim()) {
    issues.push({
      code: "missing_image_alt",
      severity: "warning",
      message: "建議填寫圖片替代文字以改善無障礙瀏覽。",
    });
  }

  if (
    model.imageUrl.trim() &&
    !model.title.trim() &&
    !model.content.trim() &&
    !model.link.trim()
  ) {
    issues.push({
      code: "no_content_context",
      severity: "warning",
      message: "圖片投影片缺少標題、說明或連結。",
    });
  }

  return issues;
}

/**
 * Returns true when the placement model has no blocking errors.
 * Warnings are non-blocking.
 */
export function isHomepageHeroPlacementReady(model: HeroPlacementModel): boolean {
  return validateHomepageHeroPlacement(model).every((i) => i.severity !== "error");
}
