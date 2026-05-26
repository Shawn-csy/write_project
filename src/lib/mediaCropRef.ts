import type React from "react";

export interface MediaCropRef {
  cx: number; // -1 ~ 1
  cy: number; // -1 ~ 1
  zoom: number; // >= 1 preferred
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

export function getMediaCropStyle(url: string) {
  const { src, crop } = decodeMediaCropRef(url);
  if (!crop) return { src, style: undefined as React.CSSProperties | undefined };
  const x = 50 + crop.cx * 20;
  const y = 50 + crop.cy * 20;
  return {
    src,
    style: {
      objectPosition: `${x}% ${y}%`,
      transform: `scale(${crop.zoom})`,
      transformOrigin: "center center",
    } as React.CSSProperties,
  };
}
