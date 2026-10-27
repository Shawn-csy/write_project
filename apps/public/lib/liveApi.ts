/**
 * Browser-side API client for the static Pages build.
 *
 * Reads go to the primary API (the local backend behind a Cloudflare Tunnel)
 * first. Only when the primary is unreachable, times out or answers with a
 * 5xx does the client retry against the fallback API (a Worker reading D1).
 * 4xx answers are real answers and never trigger the fallback.
 *
 * Writes (view counts, likes, feedback) only ever go to the primary. The
 * fallback is a read-only copy, so while the primary is down they are skipped.
 */

import { mediaOriginsFromEnv, rewriteMediaUrls, type MediaOrigins } from "./mediaSources";

export type LiveApiSource = "primary" | "fallback";

export interface LiveApiConfig {
  /** Origin of the primary API. Empty string means same origin. */
  primaryOrigin: string;
  /** Origin of the fallback API. Empty string disables the fallback. */
  fallbackOrigin: string;
  /** How long to wait for the primary before giving up on it. */
  primaryTimeoutMs: number;
  /** After a primary failure, skip it for this long and read the fallback directly. */
  downCooldownMs: number;
  /** Where "/media/..." strings in JSON answers should point. Omit to leave them untouched. */
  mediaOrigins?: MediaOrigins;
  fetchImpl?: typeof fetch;
  now?: () => number;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
}

export interface LiveApiResult {
  response: Response;
  source: LiveApiSource;
}

export interface LiveApiStatus {
  /** Source of the most recent successful read, or null before any read. */
  source: LiveApiSource | null;
  /** When the fallback copy was last synced from the primary, if it said so. */
  syncedAt: string | null;
}

export class LiveApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "LiveApiError";
  }
}

const DOWN_UNTIL_KEY = "public-api:primary-down-until";
const SYNCED_AT_HEADER = "x-data-synced-at";

function trimOrigin(value: string | undefined): string {
  return (value ?? "").replace(/\/+$/, "");
}

function isServiceFailure(response: Response): boolean {
  return response.status >= 500;
}

export function createLiveApi(config: LiveApiConfig) {
  const fetchImpl = config.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = config.now ?? (() => Date.now());
  const primaryOrigin = trimOrigin(config.primaryOrigin);
  const fallbackOrigin = trimOrigin(config.fallbackOrigin);
  const hasFallback = fallbackOrigin !== "";

  let status: LiveApiStatus = { source: null, syncedAt: null };
  let downUntil = 0;
  const listeners = new Set<() => void>();

  function storage(): LiveApiConfig["storage"] {
    if (config.storage !== undefined) return config.storage;
    try {
      return typeof sessionStorage === "undefined" ? null : sessionStorage;
    } catch {
      return null;
    }
  }

  function readDownUntil(): number {
    if (downUntil) return downUntil;
    try {
      const stored = Number(storage()?.getItem(DOWN_UNTIL_KEY) ?? 0);
      if (Number.isFinite(stored) && stored > 0) downUntil = stored;
    } catch {
      /* storage blocked — the in-memory value is enough */
    }
    return downUntil;
  }

  function markPrimaryDown(): void {
    downUntil = now() + config.downCooldownMs;
    try {
      storage()?.setItem(DOWN_UNTIL_KEY, String(downUntil));
    } catch {
      /* storage blocked */
    }
  }

  function markPrimaryUp(): void {
    if (!downUntil) return;
    downUntil = 0;
    try {
      storage()?.removeItem(DOWN_UNTIL_KEY);
    } catch {
      /* storage blocked */
    }
  }

  function isPrimaryKnownDown(): boolean {
    return hasFallback && readDownUntil() > now();
  }

  function publish(next: LiveApiStatus): void {
    if (next.source === status.source && next.syncedAt === status.syncedAt) return;
    status = next;
    listeners.forEach((listener) => listener());
  }

  async function request(origin: string, path: string, init: RequestInit | undefined, timeoutMs: number | null): Promise<Response> {
    const controller = new AbortController();
    const upstream = init?.signal;
    const abortFromUpstream = () => controller.abort();
    if (upstream) {
      if (upstream.aborted) controller.abort();
      else upstream.addEventListener("abort", abortFromUpstream, { once: true });
    }
    const timer = timeoutMs === null ? null : setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(`${origin}${path}`, { ...init, signal: controller.signal });
    } finally {
      if (timer) clearTimeout(timer);
      upstream?.removeEventListener("abort", abortFromUpstream);
    }
  }

  /** Reads `path` ("/api/...") from the primary, falling back when it is unavailable. */
  async function read(path: string, init?: RequestInit): Promise<LiveApiResult> {
    if (!isPrimaryKnownDown()) {
      try {
        const response = await request(primaryOrigin, path, init, hasFallback ? config.primaryTimeoutMs : null);
        if (!isServiceFailure(response) || !hasFallback) {
          markPrimaryUp();
          publish({ source: "primary", syncedAt: null });
          return { response, source: "primary" };
        }
        await response.body?.cancel().catch(() => undefined);
      } catch (error) {
        if (!hasFallback || init?.signal?.aborted) throw error;
      }
      markPrimaryDown();
    }

    const response = await request(fallbackOrigin, path, init, null);
    publish({ source: "fallback", syncedAt: response.headers.get(SYNCED_AT_HEADER) });
    return { response, source: "fallback" };
  }

  /**
   * Sends a request to the primary only; rejects while the primary is known to
   * be down. For writes and for per-visitor reads (like status) the fallback
   * copy cannot answer.
   */
  async function primaryOnly(path: string, init?: RequestInit): Promise<Response> {
    if (isPrimaryKnownDown()) throw new LiveApiError("Primary API unavailable; write skipped", 503);
    try {
      const response = await request(primaryOrigin, path, init, config.primaryTimeoutMs);
      if (isServiceFailure(response)) markPrimaryDown();
      else markPrimaryUp();
      return response;
    } catch (error) {
      if (hasFallback) markPrimaryDown();
      throw error;
    }
  }

  async function readJson<T>(path: string, init?: RequestInit): Promise<{ data: T; source: LiveApiSource }> {
    const { response, source } = await read(path, init);
    if (!response.ok) throw new LiveApiError(`API ${path} failed: ${response.status}`, response.status);
    const data = (await response.json()) as T;
    return { data: config.mediaOrigins ? rewriteMediaUrls(data, config.mediaOrigins, source) : data, source };
  }

  return {
    read,
    readJson,
    write: primaryOnly,
    readPrimary: primaryOnly,
    getStatus: (): LiveApiStatus => status,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type LiveApi = ReturnType<typeof createLiveApi>;

/** Shared client configured from the NEXT_PUBLIC_* values baked in at build time. */
export const liveApi: LiveApi = createLiveApi({
  primaryOrigin: process.env.NEXT_PUBLIC_API_ORIGIN ?? "",
  fallbackOrigin: process.env.NEXT_PUBLIC_FALLBACK_API_ORIGIN ?? "",
  primaryTimeoutMs: 4000,
  downCooldownMs: 60_000,
  mediaOrigins: mediaOriginsFromEnv(),
});
