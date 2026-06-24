/**
 * PublicImage — preset-based Next.js image renderer for public site.
 *
 * Pass a named preset; the renderer picks sizes, objectFit, and resolves
 * crop focal point to objectPosition. No transform:scale — prevents blank
 * space when combined with next/image fill mode.
 *
 * Parent must be position:relative with explicit dimensions.
 *
 * Relative /media/ paths are rewritten to absolute backend URLs so that
 * next/image server-side fetch reaches the backend (not localhost:3000).
 * BACKEND_API_URL is read once at module load; it's available in the SSR
 * server process from docker-compose runtime env.
 *
 * Phase 3 of docs/public-media-presentation-architecture.md
 */

import Image from "next/image";
import type { MediaCropLike } from "@write/media-crop";
import type { PublicImagePreset } from "@/lib/imagePresets";
import { resolvePresetStyle, getPresetConfig } from "@/lib/imagePresets";

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
}

export function PublicImage({ src, alt, preset, crop, sizes, priority, className }: Props) {
  if (!src) return null;

  const { src: cleanSrc, style } = resolvePresetStyle(src, preset, crop);
  const config = getPresetConfig(preset);

  return (
    <Image
      src={resolveMediaSrc(cleanSrc)}
      alt={alt}
      fill
      sizes={sizes ?? config.sizes}
      priority={priority}
      style={style}
      className={className}
    />
  );
}
