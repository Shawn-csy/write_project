/**
 * Server-side API client for fetching from the backend.
 * Only used in Server Components / Route Handlers.
 *
 * Important media boundary:
 * API responses must keep public/browser-facing media URLs such as /media/...
 * because several shared public-ui components intentionally render plain <img>.
 * Docker-internal backend URLs are only for Next's image optimizer and are
 * resolved inside PublicImage, never at the API data boundary.
 */

const API_BASE = process.env.BACKEND_API_URL ?? "http://write_project-backend:1091";
const DEFAULT_TIMEOUT_MS = 8000;

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
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}
