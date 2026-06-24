/**
 * Public image display presets.
 * Each preset owns the aspect ratio, sizes hint, and object-fit semantics
 * for one named public placement.
 *
 * Phase 1 of docs/public-media-presentation-architecture.md
 */

import type { MediaCropLike } from "@write/media-crop";
import { normalizeMediaCropLike, decodeMediaCropRef } from "@write/media-crop";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PublicImagePreset =
  | "script-cover"
  | "series-cover"
  | "hero-banner"
  | "author-banner"
  | "org-banner"
  | "reader-backdrop"
  | "avatar"
  | "logo"
  | "thumbnail";

type CropMode = "cover-crop" | "contain-safe" | "focal-cover";

interface PresetConfig {
  aspectRatio: string;
  sizes: string;
  objectFit: "cover" | "contain";
  cropMode: CropMode;
}

// ── Preset table ──────────────────────────────────────────────────────────────

const PRESETS: Record<PublicImagePreset, PresetConfig> = {
  "script-cover":    { aspectRatio: "2 / 3",  sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw", objectFit: "cover",   cropMode: "focal-cover"  },
  "series-cover":    { aspectRatio: "2 / 3",  sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw", objectFit: "cover",   cropMode: "focal-cover"  },
  "hero-banner":     { aspectRatio: "16 / 5", sizes: "100vw",                                                    objectFit: "cover",   cropMode: "focal-cover"  },
  "author-banner":   { aspectRatio: "4 / 1",  sizes: "100vw",                                                    objectFit: "cover",   cropMode: "focal-cover"  },
  "org-banner":      { aspectRatio: "4 / 1",  sizes: "100vw",                                                    objectFit: "cover",   cropMode: "focal-cover"  },
  "reader-backdrop": { aspectRatio: "16 / 9", sizes: "100vw",                                                    objectFit: "cover",   cropMode: "focal-cover"  }, // reserved for reader page blurred overlay
  "avatar":          { aspectRatio: "1 / 1",  sizes: "144px",                                                    objectFit: "cover",   cropMode: "focal-cover"  },
  "logo":            { aspectRatio: "1 / 1",  sizes: "128px",                                                    objectFit: "contain", cropMode: "contain-safe" },
  "thumbnail":       { aspectRatio: "2 / 3",  sizes: "40px",                                                     objectFit: "cover",   cropMode: "focal-cover"  },
};

export function getPresetConfig(preset: PublicImagePreset): PresetConfig {
  return PRESETS[preset];
}

// ── Crop resolver — Phase 2 ───────────────────────────────────────────────────
//
// Converts MediaCropLike → safe objectPosition CSS.
// Does NOT use transform:scale — scale exposes empty container areas when
// combined with next/image fill mode.
// Focal position covers the full 0–100% range:  pos = (c + 1) / 2 * 100

export interface ResolvedImageStyle {
  src: string;
  style: CSSProperties;
}

export function resolvePresetStyle(
  url: string,
  preset: PublicImagePreset,
  cropOverride?: MediaCropLike | null,
): ResolvedImageStyle {
  const { src, crop: hashCrop } = decodeMediaCropRef(url ?? "");
  const config = getPresetConfig(preset);
  const crop = normalizeMediaCropLike(cropOverride) ?? hashCrop;

  const objectFit = config.objectFit;

  if (!crop || config.cropMode === "contain-safe") {
    return { src, style: { objectFit } };
  }

  // cx/cy are -1..1; map to 0..100%
  const x = ((crop.cx + 1) / 2) * 100;
  const y = ((crop.cy + 1) / 2) * 100;

  return {
    src,
    style: {
      objectFit,
      objectPosition: `${x.toFixed(1)}% ${y.toFixed(1)}%`,
    },
  };
}
