import { stripMediaExtension } from "./publicMediaUrl";
import { fetchRemoteImage } from "./remoteImageFetch";

const BACKEND_ORIGIN = (process.env.BACKEND_API_URL || "http://write_project-backend:1091").replace(/\/+$/, "");

// Files under /media/ carry a content hash in their name, so a copy is valid
// for a long time at the edge. Remote (external) covers can change at the
// source, so they get a much shorter edge lifetime.
const LOCAL_MEDIA_CACHE_CONTROL = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";
const REMOTE_MEDIA_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";
// Used when a requested resize could not be produced (overload, decoder error).
// The full-size original must not be pinned at the edge under a thumbnail URL.
const DEGRADED_CACHE_CONTROL = "public, max-age=60, s-maxage=60";

const MEDIA_FETCH_REVALIDATE_SECONDS = 300;
const UPSTREAM_TIMEOUT_MS = 10_000;
// Resource ceilings — this route is public and unauthenticated.
const MAX_RESIZE_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_PROXIED_BYTES = 25 * 1024 * 1024;
const MAX_RESIZE_INPUT_PIXELS = 50_000_000;
const MAX_CONCURRENT_RESIZES = 3;
const RESIZABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

let activeResizes = 0;

// Image bytes only: nosniff stops content sniffing, and the CSP/sandbox keeps a
// same-origin SVG (or anything mislabelled) from running script if opened directly.
const SAFETY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
};

function plain(message: string, status: number): Response {
  return new Response(message, { status, headers: { "cache-control": "no-store", ...SAFETY_HEADERS } });
}

function baseHeaders(cacheControl: string): Headers {
  const headers = new Headers(SAFETY_HEADERS);
  headers.set("cache-control", cacheControl);
  return headers;
}

/** Caps a body whose size the upstream did not declare. */
function limitBody(body: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > maxBytes) controller.error(new Error("Media too large"));
        else controller.enqueue(chunk);
      },
    }),
  );
}

/**
 * Streams the upstream image through, or — when a width is requested and the
 * source is a still JPEG/PNG/WebP wider than that — returns a downscaled WebP.
 * Anything that stops a resize (size, overload, decoder error) falls back to
 * the original bytes with a short cache lifetime.
 */
async function imageResponse(
  upstream: Response,
  contentType: string | null,
  cacheControl: string,
  width: number | null,
): Promise<Response> {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  const declaredLength = Number(upstream.headers.get("content-length") || 0);
  if (declaredLength > MAX_PROXIED_BYTES) {
    await upstream.body?.cancel().catch(() => undefined);
    return plain("Media too large", 413);
  }

  const passthrough = (control: string) => {
    const headers = baseHeaders(control);
    if (contentType) headers.set("content-type", contentType);
    if (declaredLength > 0) headers.set("content-length", String(declaredLength));
    const body = declaredLength > 0 || !upstream.body ? upstream.body : limitBody(upstream.body, MAX_PROXIED_BYTES);
    return new Response(body, { status: 200, headers });
  };

  // Only resize when the size is known up front, so we never buffer an
  // unbounded body in memory.
  if (!width || !RESIZABLE_TYPES.has(type) || declaredLength <= 0 || declaredLength > MAX_RESIZE_SOURCE_BYTES) {
    return passthrough(cacheControl);
  }
  if (activeResizes >= MAX_CONCURRENT_RESIZES) return passthrough(DEGRADED_CACHE_CONTROL);

  activeResizes += 1;
  try {
    const source = Buffer.from(await upstream.arrayBuffer());
    const original = (control: string) => {
      const headers = baseHeaders(control);
      headers.set("content-type", contentType || type);
      headers.set("content-length", String(source.byteLength));
      return new Response(new Uint8Array(source), { status: 200, headers });
    };
    if (source.byteLength > MAX_RESIZE_SOURCE_BYTES) return original(DEGRADED_CACHE_CONTROL);

    try {
      const sharp = (await import("sharp")).default;
      const options = { limitInputPixels: MAX_RESIZE_INPUT_PIXELS, failOn: "error" as const };
      const metadata = await sharp(source, options).metadata();
      // Nothing to gain: already small enough, or animated (resizing would flatten it).
      if ((metadata.pages ?? 1) > 1 || !metadata.width || metadata.width <= width) return original(cacheControl);
      const resized = await sharp(source, options)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      if (resized.byteLength >= source.byteLength) return original(cacheControl);
      const headers = baseHeaders(cacheControl);
      headers.set("content-type", "image/webp");
      headers.set("content-length", String(resized.byteLength));
      return new Response(new Uint8Array(resized), { status: 200, headers });
    } catch {
      return original(DEGRADED_CACHE_CONTROL);
    }
  } catch {
    return plain("Media unavailable", 502);
  } finally {
    activeResizes -= 1;
  }
}

function decodeMediaToken(token: string): string {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Resolves a decoded `/media/...` path against the backend and refuses
 * anything that escapes the media directory. URL parsing normalizes encoded
 * dot segments (`%2e%2e`), so the check must run on the parsed pathname, not
 * on the raw string.
 */
export function resolveBackendMediaUrl(rawUrl: string): URL | null {
  if (!rawUrl.startsWith("/media/") || rawUrl.includes("..") || rawUrl.includes("\\") || /[\x00-\x1f]/.test(rawUrl)) return null;
  let target: URL;
  try {
    target = new URL(rawUrl, `${BACKEND_ORIGIN}/`);
  } catch {
    return null;
  }
  if (target.origin !== new URL(BACKEND_ORIGIN).origin) return null;
  if (!target.pathname.startsWith("/media/") || target.pathname.includes("//")) return null;
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(target.pathname);
  } catch {
    return null;
  }
  if (/[\x00-\x1f\\]/.test(decodedPath)) return null;
  if (decodedPath.split("/").some((segment) => segment === "..")) return null;
  return target;
}

async function servePublicMediaPath(rawUrl: string, width: number | null): Promise<Response> {
  const target = resolveBackendMediaUrl(rawUrl);
  if (!target) return plain("Invalid media URL", 400);

  try {
    const upstream = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!upstream.ok || !upstream.body) {
      return plain("Media not found", upstream.status || 404);
    }

    const contentType = upstream.headers.get("content-type");
    const inferredType = /\.webp(?:$|\?)/i.test(target.pathname)
      ? "image/webp"
      : /\.jpe?g(?:$|\?)/i.test(target.pathname)
        ? "image/jpeg"
        : /\.png(?:$|\?)/i.test(target.pathname)
          ? "image/png"
          : contentType;
    if (!inferredType || !inferredType.toLowerCase().startsWith("image/")) {
      await upstream.body.cancel().catch(() => undefined);
      return plain("Media is not an image", 415);
    }
    return imageResponse(upstream, inferredType, LOCAL_MEDIA_CACHE_CONTROL, width);
  } catch {
    return plain("Media unavailable", 502);
  }
}

async function serveRemoteImage(rawUrl: string, width: number | null): Promise<Response> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return plain("Invalid media URL", 400);
  }

  try {
    const upstream = await fetchRemoteImage(target);
    if (!upstream) return plain("Invalid media URL", 400);
    if (!upstream.ok || !upstream.body) {
      return plain("Media not found", upstream.status || 404);
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      await upstream.body.cancel().catch(() => undefined);
      return plain("Media is not an image", 415);
    }
    return imageResponse(upstream, contentType || null, REMOTE_MEDIA_CACHE_CONTROL, width);
  } catch {
    return plain("Media unavailable", 502);
  }
}

export async function servePublicMedia(token: string, width: number | null = null): Promise<Response> {
  let rawUrl = "";
  try {
    rawUrl = decodeMediaToken(stripMediaExtension(token));
  } catch {
    return plain("Invalid media token", 400);
  }
  return servePublicMediaPath(rawUrl, width);
}

export async function serveExternalPublicMedia(rawId: string, width: number | null = null): Promise<Response> {
  const id = stripMediaExtension(rawId);
  try {
    // Every external cover lookup used to refetch the whole bundle uncached.
    const response = await fetch(`${BACKEND_ORIGIN}/api/public-bundle`, {
      next: { revalidate: MEDIA_FETCH_REVALIDATE_SECONDS, tags: ["public-bundle"] },
    });
    if (!response.ok) return plain("Media source unavailable", 502);
    const bundle = await response.json() as { externalPublicScripts?: Array<{ id?: string; coverUrl?: string }> };
    const item = (bundle.externalPublicScripts || []).find((candidate) => candidate.id === id);
    if (!item?.coverUrl) return plain("Media not found", 404);
    return item.coverUrl.startsWith("/media/")
      ? servePublicMediaPath(item.coverUrl, width)
      : serveRemoteImage(item.coverUrl, width);
  } catch {
    return plain("Media source unavailable", 502);
  }
}
