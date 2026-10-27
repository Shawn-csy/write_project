/**
 * Where public images come from in the static Pages build.
 *
 * Normally an image is read from the local media server through the tunnel
 * (the media origin). When that is unreachable the same file is read straight
 * from the R2 public bucket (the fallback origin), under the same /media/ key.
 */

export interface MediaOrigins {
  /** Origin that serves /media/... while the local backend is up. */
  primary: string;
  /** Public R2 origin holding the same /media/... keys. Empty disables it. */
  fallback: string;
}

function trimOrigin(value: string | undefined): string {
  return (value ?? "").replace(/\/+$/, "");
}

export function mediaOriginsFromEnv(): MediaOrigins {
  const api = trimOrigin(process.env.NEXT_PUBLIC_API_ORIGIN);
  return {
    primary: trimOrigin(process.env.NEXT_PUBLIC_MEDIA_ORIGIN) || api,
    fallback: trimOrigin(process.env.NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN),
  };
}

/**
 * Makes every "/media/..." string in an API payload absolute, the same way the
 * build-time fetch does, so cards render the same images before and after a
 * browser refresh. `source` picks which origin: data that came from the
 * fallback API points at R2 so a dead tunnel is never touched for images.
 */
export function rewriteMediaUrls<T>(value: T, origins: MediaOrigins, source: "primary" | "fallback"): T {
  const origin = source === "fallback" && origins.fallback ? origins.fallback : origins.primary;
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return node.startsWith("/media/") ? `${origin}${node}` : node;
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([key, nested]) => [key, walk(nested)]));
    }
    return node;
  };
  return walk(value) as T;
}

/** The R2 address of an image that failed on the primary origin, or null if it is not one of ours. */
export function toFallbackMediaUrl(src: string, origins: MediaOrigins): string | null {
  if (!origins.primary || !origins.fallback) return null;
  const prefix = `${origins.primary}/media/`;
  if (!src.startsWith(prefix)) return null;
  return `${origins.fallback}/media/${src.slice(prefix.length)}`;
}
