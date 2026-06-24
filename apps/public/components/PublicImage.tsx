/**
 * PublicImage — preset-based Next.js image renderer for public site.
 *
 * Pass a named preset; the renderer picks sizes, objectFit, and resolves
 * crop focal point to objectPosition. No transform:scale — prevents blank
 * space when combined with next/image fill mode.
 *
 * Parent must be position:relative with explicit dimensions.
 *
 * Phase 3 of docs/public-media-presentation-architecture.md
 */

import Image from "next/image";
import type { MediaCropLike } from "@write/media-crop";
import type { PublicImagePreset } from "@/lib/imagePresets";
import { resolvePresetStyle, getPresetConfig } from "@/lib/imagePresets";

interface Props {
  src: string;
  alt: string;
  preset: PublicImagePreset;
  crop?: MediaCropLike | null;
  /** Override sizes when preset default is insufficient (e.g. fixed-pixel avatars) */
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function PublicImage({ src, alt, preset, crop, sizes, priority, className }: Props) {
  if (!src) return null;

  const { src: cleanSrc, style } = resolvePresetStyle(src, preset, crop);
  const config = getPresetConfig(preset);

  return (
    <Image
      src={cleanSrc}
      alt={alt}
      fill
      sizes={sizes ?? config.sizes}
      priority={priority}
      style={style}
      className={className}
    />
  );
}
