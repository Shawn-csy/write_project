/**
 * Media crop helpers for the public Next.js app.
 * Copied from src/lib/mediaCropRef.ts — no Vite deps.
 */

export interface MediaCrop {
  cx: number; // -1 ~ 1
  cy: number; // -1 ~ 1
  zoom: number; // >= 1
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function decodeCropHash(url: string): { src: string; crop: MediaCrop | null } {
  const text = String(url || "");
  const [src, hash = ""] = text.split("#");
  const match = hash.match(/srCrop=([^&]+)/);
  if (!match?.[1]) return { src: text, crop: null };
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<MediaCrop>;
    if (typeof parsed !== "object" || parsed === null) return { src, crop: null };
    return {
      src,
      crop: {
        cx: clamp(Number(parsed.cx ?? 0), -1, 1),
        cy: clamp(Number(parsed.cy ?? 0), -1, 1),
        zoom: clamp(Number(parsed.zoom ?? 1), 0.35, 3),
      },
    };
  } catch {
    return { src, crop: null };
  }
}

function normalizeCrop(
  crop: { cx?: number | null; cy?: number | null; zoom?: number | null } | null | undefined
): MediaCrop | null {
  if (!crop || typeof crop !== "object") return null;
  const cx = Number(crop.cx ?? 0);
  const cy = Number(crop.cy ?? 0);
  const zoom = Number(crop.zoom ?? 1);
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(zoom))
    return null;
  return {
    cx: clamp(cx, -1, 1),
    cy: clamp(cy, -1, 1),
    zoom: clamp(zoom, 0.35, 3),
  };
}

export interface CropResult {
  src: string;
  style: React.CSSProperties | undefined;
}

export function getMediaCropStyle(
  url: string,
  cropOverride?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null
): CropResult {
  const { src, crop: hashCrop } = decodeCropHash(url);
  const crop = normalizeCrop(cropOverride) ?? hashCrop;
  if (!crop) return { src, style: undefined };
  const x = 50 + crop.cx * 20;
  const y = 50 + crop.cy * 20;
  return {
    src,
    style: {
      objectPosition: `${x}% ${y}%`,
      transform: `scale(${crop.zoom})`,
      transformOrigin: "center center",
    },
  };
}
