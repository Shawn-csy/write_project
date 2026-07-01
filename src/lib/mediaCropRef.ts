import type { MediaCropLike } from "@write/media-crop";

export type {
  MediaCropRef,
  MediaCropLike,
  CropResult,
} from "@write/media-crop";

export {
  encodeMediaCropRef,
  decodeMediaCropRef,
  normalizeMediaCropLike,
  getMediaCropStyle,
} from "@write/media-crop";

/**
 * True when a URL is a persisted remote/absolute path where a cropRef can be
 * stored and retrieved later. Blob URLs and raw file paths are excluded because
 * they are transient; a cropRef saved against them would be unresolvable on
 * reload.
 */
export function canApplyPersistentCropRef(url: string): boolean {
  return /^(https?:\/\/|\/)/.test(url);
}

/**
 * Sanitize a raw MediaCropLike before using it as dialog initial state.
 * Rejects non-finite values (Infinity, NaN) and out-of-range cx/cy, falling
 * back to safe defaults. Returns null when input is null/undefined.
 */
export function normalizeInitialCropRef(
  raw: MediaCropLike | null | undefined
): { cx: number; cy: number; zoom: number } | null {
  if (raw == null) return null;
  const cx = Number(raw.cx);
  const cy = Number(raw.cy);
  const zoom = Number(raw.zoom);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    cx: Number.isFinite(cx) ? clamp(cx, -1, 1) : 0,
    cy: Number.isFinite(cy) ? clamp(cy, -1, 1) : 0,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
  };
}
