/**
 * Server-side API client for fetching from the backend.
 * Only used in Server Components / Route Handlers.
 *
 * Known media URL fields in API responses are resolved to absolute backend
 * URLs so that next/image can fetch them server-side. This is necessary because
 * data often crosses the server→client boundary (passed as props to "use client"
 * components), where process.env.BACKEND_API_URL is unavailable.
 */

const API_BASE = process.env.BACKEND_API_URL ?? "http://write_project-backend:1091";
const BACKEND_ORIGIN = API_BASE.replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 8000;

const MEDIA_URL_FIELD_NAMES = new Set([
  "avatar",
  "avatarUrl",
  "bannerUrl",
  "coverUrl",
  "imageUrl",
  "logoUrl",
  "activityBannerUrl",
]);

/**
 * Resolve a backend media path to an absolute URL. Crop hash fragments are
 * preserved because they are part of the media presentation contract.
 */
export function resolvePublicMediaUrl(value: string): string {
  if (value.startsWith("/media/")) return `${BACKEND_ORIGIN}${value}`;
  return value;
}

/**
 * Recursively resolve only known media URL fields. This intentionally does not
 * rewrite arbitrary string values, so script content and custom metadata that
 * happen to begin with "/media/" are left untouched.
 */
export function resolveMediaUrlsInPublicResponse<T>(data: T, key?: string): T {
  if (typeof data === "string") {
    return (key && MEDIA_URL_FIELD_NAMES.has(key) ? resolvePublicMediaUrl(data) : data) as T;
  }
  if (Array.isArray(data)) return data.map((item) => resolveMediaUrlsInPublicResponse(item)) as T;
  if (data !== null && typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = resolveMediaUrlsInPublicResponse(v, k);
    }
    return out as T;
  }
  return data;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort();
    else upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
  }
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    return resolveMediaUrlsInPublicResponse(json) as T;
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}
