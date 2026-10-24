/**
 * URL helpers for the public media proxy (`/api/public-media/*`).
 *
 * - The proxy path carries a `.webp` suffix so Cloudflare, which decides edge
 *   cacheability from the file extension, caches it. The route handlers strip
 *   the suffix again; the real Content-Type comes from the response header.
 * - `?w=` requests a downscaled copy. Only a fixed set of widths is honored so
 *   the CDN cache cannot be fragmented by arbitrary values.
 */

export const PUBLIC_MEDIA_WIDTHS = [240, 360, 480, 720, 960] as const;

const PROXY_PREFIX = "/api/public-media/";

/** Appends `.webp` to a proxy path (before any query string) unless present. */
export function withMediaExtension(src: string): string {
  if (!src.startsWith(PROXY_PREFIX)) return src;
  const queryIndex = src.indexOf("?");
  const path = queryIndex === -1 ? src : src.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : src.slice(queryIndex);
  return path.endsWith(".webp") ? src : `${path}.webp${query}`;
}

/** Removes the cosmetic `.webp` suffix added by {@link withMediaExtension}. */
export function stripMediaExtension(segment: string): string {
  return segment.endsWith(".webp") ? segment.slice(0, -".webp".length) : segment;
}

/** Builds a `srcSet` of resized proxy variants; empty string for other sources. */
export function buildMediaSrcSet(src: string): string {
  if (!src.startsWith(PROXY_PREFIX) || src.includes("?")) return "";
  const base = withMediaExtension(src);
  return PUBLIC_MEDIA_WIDTHS.map((width) => `${base}?w=${width} ${width}w`).join(", ");
}

/** Maps a requested width onto the smallest allowed width that covers it. */
export function parseMediaWidth(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const requested = Number(raw);
  if (!Number.isFinite(requested) || requested <= 0) return null;
  return PUBLIC_MEDIA_WIDTHS.find((width) => width >= requested) ?? PUBLIC_MEDIA_WIDTHS[PUBLIC_MEDIA_WIDTHS.length - 1];
}
