import { stripMediaExtension } from "./publicMediaUrl";
import { fetchRemoteImage } from "./remoteImageFetch";

const BACKEND_ORIGIN = (process.env.BACKEND_API_URL || "http://write_project-backend:1091").replace(/\/+$/, "");

// Files under /media/ carry a content hash in their name, so a copy is valid
// for a long time at the edge. Remote (external) covers can change at the
// source, so they get a much shorter edge lifetime.
const LOCAL_MEDIA_CACHE_CONTROL = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";
const REMOTE_MEDIA_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";
// Used when a requested resize could not be produced (decoder error).
// The full-size original must not be pinned at the edge under a thumbnail URL.
const DEGRADED_CACHE_CONTROL = "public, max-age=60, s-maxage=60";

const MEDIA_FETCH_REVALIDATE_SECONDS = 300;
const UPSTREAM_TIMEOUT_MS = 10_000;
// Resource ceilings — this route is public and unauthenticated.
const MAX_RESIZE_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_PROXIED_BYTES = 25 * 1024 * 1024;
const MAX_RESIZE_INPUT_PIXELS = 50_000_000;
const MAX_CONCURRENT_MEDIA_REQUESTS = 12;
const MAX_QUEUED_MEDIA_REQUESTS = 96;
const MAX_CONCURRENT_RESIZES = 3;
const MAX_QUEUED_RESIZES = 12;
const CAPACITY_WAIT_MS = 5000;
const MAX_LOCAL_VARIANT_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_LOCAL_VARIANT_ENTRY_BYTES = 512 * 1024;
const RESIZABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface LocalVariant {
  bytes: Uint8Array;
  headers: [string, string][];
}

// Local media filenames are immutable. Keep small resized variants in a bounded
// process cache so repeat requests do not re-fetch and re-encode the same file.
const localVariants = new Map<string, LocalVariant>();
const pendingLocalVariants = new Map<string, Promise<{ entry: LocalVariant } | { response: Response }>>();
let localVariantBytes = 0;

function variantResponse(entry: LocalVariant): Response {
  return new Response(new Uint8Array(entry.bytes), { status: 200, headers: entry.headers });
}

function rememberVariant(key: string, entry: LocalVariant): void {
  const old = localVariants.get(key);
  if (old) localVariantBytes -= old.bytes.byteLength;
  localVariants.delete(key);
  localVariants.set(key, entry);
  localVariantBytes += entry.bytes.byteLength;
  while (localVariantBytes > MAX_LOCAL_VARIANT_CACHE_BYTES) {
    const oldest = localVariants.keys().next().value;
    if (!oldest) break;
    localVariantBytes -= localVariants.get(oldest)!.bytes.byteLength;
    localVariants.delete(oldest);
  }
}

async function cachedLocalVariant(key: string, load: () => Promise<Response>): Promise<Response> {
  const hit = localVariants.get(key);
  if (hit) {
    localVariants.delete(key);
    localVariants.set(key, hit);
    return variantResponse(hit);
  }
  let leader = false;
  let pending = pendingLocalVariants.get(key);
  if (!pending) {
    leader = true;
    pending = (async () => {
      const response = await load();
      const length = Number(response.headers.get("content-length"));
      if (response.status !== 200 || response.headers.get("cache-control") !== LOCAL_MEDIA_CACHE_CONTROL
        || !Number.isSafeInteger(length) || length <= 0 || length > MAX_LOCAL_VARIANT_ENTRY_BYTES) {
        return { response };
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength !== length) return { response: plain("Media unavailable", 502) };
      const entry: LocalVariant = { bytes, headers: [...response.headers.entries()] };
      rememberVariant(key, entry);
      return { entry };
    })();
    pendingLocalVariants.set(key, pending);
  }
  try {
    const result = await pending;
    if ("entry" in result) return variantResponse(result.entry);
    // An oversized or degraded response remains uncached. Each waiter gets a
    // fresh body; a Response cannot be consumed by multiple callers.
    return leader ? result.response : load();
  } finally {
    if (leader) pendingLocalVariants.delete(key);
  }
}

/** Bounds upstream initiation and CPU work; waiting requests hold no upstream body. */
class CapacityGate {
  private active = 0;
  private readonly waiting: Array<{ grant: () => void }> = [];

  constructor(private readonly limit: number, private readonly queueLimit: number) {}

  acquire(): Promise<boolean> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve(true);
    }
    if (this.waiting.length >= this.queueLimit) return Promise.resolve(false);
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout>;
      const waiter = { grant: () => { clearTimeout(timer); resolve(true); } };
      timer = setTimeout(() => {
        const index = this.waiting.indexOf(waiter);
        if (index >= 0) this.waiting.splice(index, 1);
        resolve(false);
      }, CAPACITY_WAIT_MS);
      this.waiting.push(waiter);
    });
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) next.grant();
    else this.active -= 1;
  }
}

const mediaRequestGate = new CapacityGate(MAX_CONCURRENT_MEDIA_REQUESTS, MAX_QUEUED_MEDIA_REQUESTS);
const resizeGate = new CapacityGate(MAX_CONCURRENT_RESIZES, MAX_QUEUED_RESIZES);

// Image bytes only: nosniff stops content sniffing, and the CSP/sandbox keeps a
// same-origin SVG (or anything mislabelled) from running script if opened directly.
const SAFETY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
};

function plain(message: string, status: number): Response {
  return new Response(message, { status, headers: { "cache-control": "no-store", ...SAFETY_HEADERS } });
}

async function withMediaRequestSlot(work: () => Promise<Response>): Promise<Response> {
  if (!await mediaRequestGate.acquire()) return plain("Media busy", 503);
  try {
    return await work();
  } finally {
    mediaRequestGate.release();
  }
}

function baseHeaders(cacheControl: string): Headers {
  const headers = new Headers(SAFETY_HEADERS);
  headers.set("cache-control", cacheControl);
  return headers;
}

/** Caps actual streamed bytes even when an upstream lies about Content-Length. */
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

class MediaTooLargeError extends Error {}

/** Reads a resize source without trusting its advertised length. */
async function readBodyBounded(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, total);
      if (total + value.byteLength > maxBytes) throw new MediaTooLargeError("Media too large");
      chunks.push(Buffer.from(value));
      total += value.byteLength;
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Streams the upstream image through, or — when a width is requested and the
 * source is a still JPEG/PNG/WebP wider than that — returns a downscaled WebP.
 * Decoder errors fall back to the original bytes with a short cache lifetime.
 * A full queue returns an uncached 503 instead of serving an oversized image.
 */
async function imageResponse(
  upstream: Response,
  contentType: string | null,
  cacheControl: string,
  width: number | null,
): Promise<Response> {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  const declaredLength = Number(upstream.headers.get("content-length") || 0);
  const body = upstream.body;
  if (!body) return plain("Media unavailable", 502);
  if (declaredLength > MAX_PROXIED_BYTES) {
    await body.cancel().catch(() => undefined);
    return plain("Media too large", 413);
  }

  const passthrough = (control: string) => {
    const headers = baseHeaders(control);
    if (contentType) headers.set("content-type", contentType);
    // Do not forward an unverified Content-Length with a guarded stream.
    return new Response(limitBody(body, MAX_PROXIED_BYTES), { status: 200, headers });
  };

  if (!width || !RESIZABLE_TYPES.has(type)) {
    return passthrough(cacheControl);
  }
  if (declaredLength > MAX_RESIZE_SOURCE_BYTES) {
    await body.cancel().catch(() => undefined);
    return plain("Media too large", 413);
  }
  if (!await resizeGate.acquire()) {
    await body.cancel().catch(() => undefined);
    return plain("Media busy", 503);
  }
  try {
    const source = await readBodyBounded(body, MAX_RESIZE_SOURCE_BYTES);
    const original = (control: string) => {
      const headers = baseHeaders(control);
      headers.set("content-type", contentType || type);
      headers.set("content-length", String(source.byteLength));
      return new Response(new Uint8Array(source), { status: 200, headers });
    };
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
  } catch (error) {
    if (error instanceof MediaTooLargeError) return plain("Media too large", 413);
    return plain("Media unavailable", 502);
  } finally {
    resizeGate.release();
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

  const load = async (): Promise<Response> => {
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
  };
  return width && !target.search ? cachedLocalVariant(`${target.href}|${width}`, load) : load();
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
  if (token.length > 4096) return plain("Invalid media token", 400);
  let rawUrl = "";
  try {
    rawUrl = decodeMediaToken(stripMediaExtension(token));
  } catch {
    return plain("Invalid media token", 400);
  }
  return withMediaRequestSlot(() => servePublicMediaPath(rawUrl, width));
}

export async function serveExternalPublicMedia(rawId: string, width: number | null = null): Promise<Response> {
  const id = stripMediaExtension(rawId);
  if (!id || id.length > 200) return plain("Media not found", 404);
  return withMediaRequestSlot(async () => {
    try {
      const response = await fetch(`${BACKEND_ORIGIN}/api/public-external-scripts/${encodeURIComponent(id)}/cover`, {
        next: { revalidate: MEDIA_FETCH_REVALIDATE_SECONDS, tags: ["public-bundle"] },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (response.status === 404) return plain("Media not found", 404);
      if (!response.ok) return plain("Media source unavailable", 502);
      const lookup = await response.json() as { coverUrl?: string };
      if (!lookup.coverUrl) return plain("Media not found", 404);
      return lookup.coverUrl.startsWith("/media/")
        ? servePublicMediaPath(lookup.coverUrl, width)
        : serveRemoteImage(lookup.coverUrl, width);
    } catch {
      return plain("Media source unavailable", 502);
    }
  });
}
