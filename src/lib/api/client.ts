import { getLoadedAuth, loadFirebaseAuth } from "../firebase";

interface FetchApiOptions {
  method?: string;
  cache?: string;
  noCache?: boolean;
  cacheTtlMs?: number;
  headers?: Record<string, string>;
  body?: string;
  [key: string]: unknown;
}

interface ApiError extends Error {
  status?: number;
  retryable?: boolean;
}

const getEnv = (key: string): string | undefined => {
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  return import.meta.env[key];
};

export const API_BASE_URL = getEnv("VITE_API_URL") || "/api";
const localAuthEnabled = ["1", "true", "yes"].includes(String(getEnv("VITE_LOCAL_AUTH")).toLowerCase());
const localAuthUserId = getEnv("VITE_LOCAL_AUTH_UID") || "local-test-user";

const DEFAULT_CACHE_TTL_MS = 60000;
const DEFAULT_PUBLIC_CACHE_TTL_MS = 60000;
const privateCache = new Map<string, { value: unknown; expiresAt: number }>();
const privateInflight = new Map<string, Promise<unknown>>();
const privateResourceEpoch = new Map<string, number>();
let privateGlobalEpoch = 0;
const publicCache = new Map<string, { value: unknown; expiresAt: number }>();
const publicInflight = new Map<string, Promise<unknown>>();
let publicEpoch = 0;

const getUserKey = () => {
  if (localAuthEnabled) return localAuthUserId;
  // Sync peek is enough for cache keys; before firebase loads there is no user anyway.
  return getLoadedAuth()?.currentUser?.uid || "anon";
};

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (localAuthEnabled) {
    return { "X-User-ID": localAuthUserId };
  }
  const { auth } = await loadFirebaseAuth();
  if (auth.currentUser?.getIdToken) {
    const token = await auth.currentUser.getIdToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

function resourceScope(endpoint: string): string | null {
  const segments = new URL(endpoint, "http://localhost").pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  // Admin lists can represent the same record in several views. A write to
  // one list must refresh all admin reads until those dependencies are modeled.
  return segments[0];
}

function invalidatePrivateResource(endpoint: string): void {
  const scope = resourceScope(endpoint);
  if (!scope) {
    privateGlobalEpoch++;
    privateCache.clear();
    privateInflight.clear();
    return;
  }
  privateResourceEpoch.set(scope, (privateResourceEpoch.get(scope) ?? 0) + 1);
  const marker = `${API_BASE_URL.replace(/\/+$/, "")}/${scope}`;
  const belongsToScope = (key: string) => {
    const index = key.indexOf(marker);
    if (index < 0) return false;
    const next = key[index + marker.length];
    return next === undefined || next === "/" || next === "?";
  };
  for (const key of privateCache.keys()) if (belongsToScope(key)) privateCache.delete(key);
  for (const key of privateInflight.keys()) if (belongsToScope(key)) privateInflight.delete(key);
}

export async function fetchApi<T = unknown>(endpoint: string, options: FetchApiOptions = {}, retries = 3, backoff = 500): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const noCache = options.cache === "no-store" || options.noCache === true;
  const cacheTtl = typeof options.cacheTtlMs === "number" ? options.cacheTtlMs : DEFAULT_CACHE_TTL_MS;
  const cacheKey = `${method}:${getUserKey()}:${url}`;
  const scope = resourceScope(endpoint);
  const globalEpochAtStart = privateGlobalEpoch;
  const resourceEpochAtStart = scope ? privateResourceEpoch.get(scope) ?? 0 : 0;

  if (method === "GET" && !noCache) {
    const cached = privateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
    const inflight = privateInflight.get(cacheKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const { noCache: _noCache, cacheTtlMs: _cacheTtlMs, ...fetchOptions } = options;
  const run = async (remaining: number, delay: number): Promise<T> => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...(options.headers ?? {}),
        },
      } as RequestInit);
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const error: ApiError = new Error(detail?.trim()
          ? `API Error ${response.status}: ${detail.trim()}`
          : `API Error ${response.status}: ${response.statusText || "Request failed"}`);
        error.status = response.status;
        error.retryable = response.status >= 500 || response.status === 429 || response.status === 408;
        throw error;
      }
      const data = (await response.json()) as T;
      if (method === "GET") {
        if (!noCache && cacheKey === `${method}:${getUserKey()}:${url}` && globalEpochAtStart === privateGlobalEpoch && (!scope || resourceEpochAtStart === (privateResourceEpoch.get(scope) ?? 0))) {
          privateCache.set(cacheKey, { value: data, expiresAt: Date.now() + cacheTtl });
        }
      } else {
        invalidatePrivateResource(endpoint);
      }
      return data;
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.name === "TypeError" || apiErr?.name === "AbortError" || (options.signal as AbortSignal | undefined)?.aborted) {
        throw err;
      }
      if (remaining > 0 && apiErr.retryable === true) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return run(remaining - 1, delay * 1.5);
      }
      throw err;
    }
  };

  // Register before the first asynchronous auth lookup so concurrent callers
  // share the complete request, including retries.
  const request = run(retries, backoff);
  if (method !== "GET" || noCache) return request;
  const shared = request.finally(() => {
    if (privateInflight.get(cacheKey) === shared) privateInflight.delete(cacheKey);
  });
  privateInflight.set(cacheKey, shared);
  return shared;
}

export async function fetchPublic<T = unknown>(endpoint: string, options: FetchApiOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const noCache = options.cache === "no-store" || options.noCache === true;
  const cacheTtl = typeof options.cacheTtlMs === "number" ? options.cacheTtlMs : DEFAULT_PUBLIC_CACHE_TTL_MS;
  const cacheKey = `${method}:public:${url}`;
  const epochAtStart = publicEpoch;

  if (method === "GET" && !noCache) {
    const cached = publicCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
    const inflight = publicInflight.get(cacheKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const { noCache: _nc, cacheTtlMs: _ct, ...publicFetchOptions } = options;
  const request = (async () => {
    const response = await fetch(url, publicFetchOptions as RequestInit);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    const data = await response.json();
    if (method === "GET") {
      if (!noCache && epochAtStart === publicEpoch) publicCache.set(cacheKey, { value: data, expiresAt: Date.now() + cacheTtl });
    } else {
      publicEpoch++;
      publicCache.clear();
      publicInflight.clear();
    }
    return data as T;
  })();
  if (method !== "GET" || noCache) return request;
  const shared = request.finally(() => {
    if (publicInflight.get(cacheKey) === shared) publicInflight.delete(cacheKey);
  });
  publicInflight.set(cacheKey, shared);
  return shared;
}
