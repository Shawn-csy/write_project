import { auth } from "../firebase";
import { isApiOffline, markApiOffline, clearApiOffline } from "../apiHealth";

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
const publicCache = new Map<string, { value: unknown; expiresAt: number }>();
const publicInflight = new Map<string, Promise<unknown>>();

const getUserKey = () => {
  if (localAuthEnabled) return localAuthUserId;
  return auth.currentUser?.uid || "anon";
};

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (localAuthEnabled) {
    return { "X-User-ID": localAuthUserId };
  }
  if (auth.currentUser?.getIdToken) {
    const token = await auth.currentUser.getIdToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

export async function fetchApi<T = unknown>(endpoint: string, options: FetchApiOptions = {}, retries = 3, backoff = 500): Promise<T> {
  if (isApiOffline()) {
    throw new Error("API offline (cooldown)");
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const noCache = options.cache === "no-store" || options.noCache === true;
  const cacheTtl = typeof options.cacheTtlMs === "number" ? options.cacheTtlMs : DEFAULT_CACHE_TTL_MS;
  const cacheKey = `${method}:${getUserKey()}:${url}`;

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

  const authHeaders = await getAuthHeaders();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...(options.headers ?? {}),
  };

  const { noCache: _noCache, cacheTtlMs: _cacheTtlMs, ...fetchOptions } = options;

  try {
    const inflightPromise = (async () => {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      } as RequestInit);

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const message = detail?.trim()
          ? `API Error ${response.status}: ${detail.trim()}`
          : `API Error ${response.status}: ${response.statusText || "Request failed"}`;
        const error: ApiError = new Error(message);
        error.status = response.status;
        error.retryable = response.status >= 500 || response.status === 429 || response.status === 408;
        throw error;
      }

      clearApiOffline();
      const data = await response.json();
      if (method === "GET" && !noCache) {
        privateCache.set(cacheKey, { value: data, expiresAt: Date.now() + cacheTtl });
        privateInflight.delete(cacheKey);
      } else {
        // Invalidate only cache entries for the same resource type,
        // not the entire cache (e.g. saving settings shouldn't bust the script list cache).
        try {
          const parsed = new URL(url, "http://localhost");
          const segments = parsed.pathname.split("/").filter(Boolean);
          const resourceSegment = segments[1] || segments[0] || "";
          if (resourceSegment) {
            for (const key of privateCache.keys()) {
              if (key.includes(`/${resourceSegment}`)) privateCache.delete(key);
            }
          } else {
            privateCache.clear();
          }
        } catch {
          privateCache.clear();
        }
        privateInflight.clear();
      }
      return data as T;
    })();

    if (method === "GET" && !noCache) {
      privateInflight.set(cacheKey, inflightPromise);
    }

    return await inflightPromise;
  } catch (err) {
    privateInflight.delete(cacheKey);
    const apiErr = err as ApiError;
    if (apiErr?.name === "TypeError") {
      markApiOffline(apiErr, "api.fetchApi");
      throw err;
    }
    const retryableHttpError = typeof apiErr?.status === "number" ? apiErr.retryable !== false : true;
    if (retries > 0 && retryableHttpError) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchApi<T>(endpoint, options, retries - 1, backoff * 1.5);
    }
    throw err;
  }
}

export async function fetchPublic<T = unknown>(endpoint: string, options: FetchApiOptions = {}): Promise<T> {
  if (isApiOffline()) {
    throw new Error("API offline (cooldown)");
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const noCache = options.cache === "no-store" || options.noCache === true;
  const cacheTtl = typeof options.cacheTtlMs === "number" ? options.cacheTtlMs : DEFAULT_PUBLIC_CACHE_TTL_MS;
  const cacheKey = `${method}:public:${url}`;

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

  try {
    const { noCache: _nc, cacheTtlMs: _ct, ...publicFetchOptions } = options;
    const inflightPromise = (async () => {
      const response = await fetch(url, publicFetchOptions as RequestInit);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      clearApiOffline();
      const data = await response.json();
      if (method === "GET" && !noCache) {
        publicCache.set(cacheKey, { value: data, expiresAt: Date.now() + cacheTtl });
        publicInflight.delete(cacheKey);
      } else {
        publicCache.clear();
        publicInflight.clear();
      }
      return data as T;
    })();

    if (method === "GET" && !noCache) {
      publicInflight.set(cacheKey, inflightPromise);
    }

    return await inflightPromise;
  } catch (err) {
    publicInflight.delete(cacheKey);
    const apiErr = err as ApiError;
    if (apiErr?.name === "TypeError") {
      markApiOffline(apiErr, "api.fetchPublic");
    }
    throw err;
  }
}
