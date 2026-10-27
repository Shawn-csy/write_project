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

function parseProxyPath(src: string): { prefix: string; pathname: string; search: string } | null {
  try {
    const isAbsolute = /^https?:\/\//i.test(src);
    const parsed = new URL(src, "https://local.invalid");
    if (!parsed.pathname.startsWith(PROXY_PREFIX)) return null;
    return {
      prefix: isAbsolute ? parsed.origin : "",
      pathname: parsed.pathname,
      search: parsed.search,
    };
  } catch {
    return null;
  }
}

/** Appends `.webp` to a proxy path (before any query string) unless present. */
export function withMediaExtension(src: string): string {
  const parsed = parseProxyPath(src);
  if (!parsed) return src;
  const path = parsed.pathname.endsWith(".webp") ? parsed.pathname : `${parsed.pathname}.webp`;
  return `${parsed.prefix}${path}${parsed.search}`;
}

/** Removes the cosmetic `.webp` suffix added by {@link withMediaExtension}. */
export function stripMediaExtension(segment: string): string {
  return segment.endsWith(".webp") ? segment.slice(0, -".webp".length) : segment;
}

/** Builds a `srcSet` of resized proxy variants; empty string for other sources. */
export function buildMediaSrcSet(src: string): string {
  if (!parseProxyPath(src) || src.includes("?")) return "";
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
