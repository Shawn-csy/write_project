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
 * /media/ paths use the bounded public media proxy; next/image only processes
 * relative app assets and explicitly allowed public HTTPS origins.
 */

import Image from "next/image";
import type { ReactEventHandler } from "react";
import type { MediaCropLike } from "@write/media-crop";
import type { PublicImagePreset } from "@/lib/imagePresets";
import { resolvePresetStyle, getPresetConfig } from "@/lib/imagePresets";
import { isNextImageOptimizableSrc } from "@/lib/publicImageOrigins";
import { buildMediaSrcSet, withMediaExtension, type PublicMediaWidth } from "@/lib/publicMediaUrl";
import { isPublicMediaProxySrc, publicApiUrl } from "@/lib/publicApiUrl";
import { mediaOriginsFromEnv } from "@/lib/mediaSources";

// The static build has no server-side image proxy: /media/ files are read
// straight from the media origin, with R2 as the fallback (MediaFallbackBridge).
const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const RESIZABLE_PRESETS: ReadonlySet<PublicImagePreset> = new Set([
  "script-cover",
  "series-cover",
  "thumbnail",
  "avatar",
  "logo",
]);

function resolvePublicMediaProxySrc(src: string): string {
  const bytes = new TextEncoder().encode(src);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return publicApiUrl(`/api/public-media/${token}.webp`);
}

interface Props {
  src: string;
  alt: string;
  preset: PublicImagePreset;
  crop?: MediaCropLike | null;
  /** Override sizes when preset default is insufficient (e.g. fixed-pixel avatars) */
  sizes?: string;
  priority?: boolean;
  /** Start the request early while retaining responsive srcset selection. */
  eager?: boolean;
  /** One canonical proxy width for placements with a fixed rendered size. */
  fixedMediaWidth?: PublicMediaWidth;
  fetchPriority?: "high" | "low" | "auto";
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
  onError?: ReactEventHandler<HTMLImageElement>;
}

export function PublicImage({
  src,
  alt,
  preset,
  crop,
  sizes,
  priority,
  eager,
  fixedMediaWidth,
  fetchPriority,
  className,
  objectFit,
  respectCropZoom,
  overscanScale,
  onError,
}: Props) {
  if (!src) return null;

  const { src: cleanSrc, style: presetStyle } = resolvePresetStyle(src, preset, crop, {
    respectZoom: respectCropZoom,
    overscanScale,
  });
  const style = objectFit ? { ...presetStyle, objectFit } : presetStyle;
  const config = getPresetConfig(preset);
  const isPublicMedia = cleanSrc.startsWith("/media/");
  const isMediaProxy = isPublicMediaProxySrc(cleanSrc);
  if (STATIC_EXPORT && isPublicMedia) {
    return (
      <img
        src={`${mediaOriginsFromEnv().primary}${cleanSrc}`}
        alt={alt}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={fetchPriority ?? (priority || eager ? "high" : undefined)}
        decoding="async"
        referrerPolicy="no-referrer"
        style={style}
        className={`absolute inset-0 h-full w-full ${className ?? ""}`.trim()}
        onError={onError}
      />
    );
  }
  if (isMediaProxy || isPublicMedia) {
    const proxySrc = isMediaProxy ? publicApiUrl(withMediaExtension(cleanSrc)) : resolvePublicMediaProxySrc(cleanSrc);
    // Priority images keep a single src: a srcset could make the browser pick
    // a different URL than the one preloaded in <head>. Everything else gets
    // resized variants so cards do not download full-size originals.
    // Banners/backdrops span the viewport, so they stay at full resolution.
    const fixedSrc = fixedMediaWidth && !proxySrc.includes("?") ? `${proxySrc}?w=${fixedMediaWidth}` : proxySrc;
    const srcSet = priority || fixedSrc !== proxySrc || !RESIZABLE_PRESETS.has(preset) ? "" : buildMediaSrcSet(proxySrc);
    return (
      <img
        src={fixedSrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? (sizes ?? config.sizes) : undefined}
        alt={alt}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={fetchPriority ?? (priority || eager ? "high" : undefined)}
        decoding="async"
        referrerPolicy="no-referrer"
        style={style}
        className={`absolute inset-0 h-full w-full ${className ?? ""}`.trim()}
        onError={onError}
      />
    );
  }

  if (!isNextImageOptimizableSrc(cleanSrc)) {
    return (
      <img
        src={cleanSrc}
        alt={alt}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={fetchPriority ?? (priority || eager ? "high" : undefined)}
        decoding="async"
        referrerPolicy="no-referrer"
        style={style}
        className={`absolute inset-0 h-full w-full ${className ?? ""}`.trim()}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={cleanSrc}
      alt={alt}
      fill
      sizes={sizes ?? config.sizes}
      priority={priority}
      loading={eager ? "eager" : undefined}
      fetchPriority={fetchPriority}
      style={style}
      className={className}
      onError={onError}
    />
  );
}
