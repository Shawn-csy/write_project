/**
 * PublicImage — preset-based Next.js image renderer for public site.
 *
 * Pass a named preset; the renderer picks sizes, objectFit, and resolves
 * crop focal point to objectPosition. Crop zoom is ignored by default to
 * prevent blank space when combined with next/image fill mode; hero art
 * direction can opt in to zoom when it intentionally wants tighter framing.
 *
 * Parent must be position:relative with explicit dimensions.
 *
 * /media/ path resolution: public API data stays browser-facing so shared
 * public-ui <img> components can load it. PublicImage is the only place that
 * upgrades /media/ to the backend origin for next/image's server-side optimizer.
 */

import Image from "next/image";
import type { MediaCropLike } from "@write/media-crop";
import type { PublicImagePreset } from "@/lib/imagePresets";
import { resolvePresetStyle, getPresetConfig } from "@/lib/imagePresets";
import { isNextImageOptimizableSrc } from "@/lib/publicImageOrigins";

// Read once at module load — available during SSR (server process).
// In client bundle this is undefined, but next/image src is already baked
// into the SSR HTML as /_next/image?url=ABSOLUTE_URL by that point.
const BACKEND_ORIGIN = (process.env.BACKEND_API_URL ?? "").replace(/\/+$/, "");

function resolveMediaSrc(src: string): string {
  if (BACKEND_ORIGIN && src.startsWith("/media/")) return `${BACKEND_ORIGIN}${src}`;
  return src;
}

interface Props {
  src: string;
  alt: string;
  preset: PublicImagePreset;
  crop?: MediaCropLike | null;
  /** Override sizes when preset default is insufficient (e.g. fixed-pixel avatars) */
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Override object-fit from preset default (e.g. "contain" for blur-fill foreground) */
  objectFit?: "cover" | "contain";
  /** Opt in to crop.zoom transforms for placement-specific art direction. */
  respectCropZoom?: boolean;
  /**
   * Compose an overscan scale with crop zoom into a single transform.
   * Use instead of a scale-[N] className to avoid CSS specificity conflicts
   * where inline style.transform (from zoom) would override the class.
   */
  overscanScale?: number;
}

export function PublicImage({
  src,
  alt,
  preset,
  crop,
  sizes,
  priority,
  className,
  objectFit,
  respectCropZoom,
  overscanScale,
}: Props) {
  if (!src) return null;

  const { src: cleanSrc, style: presetStyle } = resolvePresetStyle(src, preset, crop, {
    respectZoom: respectCropZoom,
    overscanScale,
  });
  const style = objectFit ? { ...presetStyle, objectFit } : presetStyle;
  const config = getPresetConfig(preset);
  const resolvedSrc = resolveMediaSrc(cleanSrc);

  if (!isNextImageOptimizableSrc(resolvedSrc, BACKEND_ORIGIN)) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        style={style}
        className={`absolute inset-0 h-full w-full ${className ?? ""}`.trim()}
      />
    );
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill
      sizes={sizes ?? config.sizes}
      priority={priority}
      style={style}
      className={className}
    />
  );
}
