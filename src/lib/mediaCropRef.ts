import type React from "react";

export interface MediaCropRef {
  cx: number; // -1 ~ 1
  cy: number; // -1 ~ 1
  zoom: number; // >= 1 preferred
}

export interface MediaCropLike {
  cx?: number | null;
  cy?: number | null;
  zoom?: number | null;
}

const HASH_KEY = "srCrop";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function encodeMediaCropRef(baseUrl: string, crop: MediaCropRef): string {
  const cleaned = String(baseUrl || "").split("#")[0];
  const payload = encodeURIComponent(JSON.stringify({
    cx: clamp(Number(crop.cx || 0), -1, 1),
    cy: clamp(Number(crop.cy || 0), -1, 1),
    zoom: clamp(Number(crop.zoom || 1), 0.35, 3),
  }));
  return `${cleaned}#${HASH_KEY}=${payload}`;
}

export function decodeMediaCropRef(url: string): { src: string; crop: MediaCropRef | null } {
  const text = String(url || "");
  const [src, hash = ""] = text.split("#");
  const match = hash.match(new RegExp(`${HASH_KEY}=([^&]+)`));
  if (!match?.[1]) return { src: text, crop: null };
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<MediaCropRef>;
    if (typeof parsed !== "object" || parsed === null) return { src, crop: null };
    return {
      src,
      crop: {
        cx: clamp(Number(parsed.cx || 0), -1, 1),
        cy: clamp(Number(parsed.cy || 0), -1, 1),
        zoom: clamp(Number(parsed.zoom || 1), 0.35, 3),
      },
    };
  } catch {
    return { src, crop: null };
  }
}

export function normalizeMediaCropLike(crop: MediaCropLike | null | undefined): MediaCropRef | null {
  if (!crop || typeof crop !== "object") return null;
  const cx = Number(crop.cx ?? 0);
  const cy = Number(crop.cy ?? 0);
  const zoom = Number(crop.zoom ?? 1);
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(zoom)) return null;
  return {
    cx: clamp(cx, -1, 1),
    cy: clamp(cy, -1, 1),
    zoom: clamp(zoom, 0.35, 3),
  };
}

export function getMediaCropStyle(url: string, cropOverride?: MediaCropLike | null) {
  const { src, crop: hashCrop } = decodeMediaCropRef(url);
  const crop = normalizeMediaCropLike(cropOverride) || hashCrop;
  if (!crop) return { src, style: undefined as React.CSSProperties | undefined, crop: null as MediaCropRef | null };
  const x = 50 + crop.cx * 20;
  const y = 50 + crop.cy * 20;
  return {
    src,
    crop,
    style: {
      objectPosition: `${x}% ${y}%`,
      transform: `scale(${crop.zoom})`,
      transformOrigin: "center center",
    } as React.CSSProperties,
  };
}
