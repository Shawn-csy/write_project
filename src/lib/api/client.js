import { auth } from "../firebase";
import { isApiOffline, markApiOffline, clearApiOffline } from "../apiHealth";

const getEnv = (key) => {
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
const privateCache = new Map();
const privateInflight = new Map();
const publicCache = new Map();
const publicInflight = new Map();

const getUserKey = () => {
  if (localAuthEnabled) return localAuthUserId;
  return auth.currentUser?.uid || "anon";
};

export async function getAuthHeaders() {
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

export async function fetchApi(endpoint, options = {}, retries = 3, backoff = 500) {
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
      return cached.value;
    }
    const inflight = privateInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }
  }

  const authHeaders = await getAuthHeaders();
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...options.headers,
  };

  try {
    const inflightPromise = (async () => {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const message = detail?.trim()
          ? `API Error ${response.status}: ${detail.trim()}`
          : `API Error ${response.status}: ${response.statusText || "Request failed"}`;
        const error = new Error(message);
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
        privateCache.clear();
        privateInflight.clear();
      }
      return data;
    })();

    if (method === "GET" && !noCache) {
      privateInflight.set(cacheKey, inflightPromise);
    }

    return await inflightPromise;
  } catch (err) {
    privateInflight.delete(cacheKey);
    if (err?.name === "TypeError") {
      markApiOffline(err, "api.fetchApi");
      throw err;
    }
    const retryableHttpError = typeof err?.status === "number" ? err.retryable !== false : true;
    if (retries > 0 && retryableHttpError) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchApi(endpoint, options, retries - 1, backoff * 1.5);
    }
    throw err;
  }
}

export async function fetchPublic(endpoint, options = {}) {
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
      return cached.value;
    }
    const inflight = publicInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }
  }

  try {
    const inflightPromise = (async () => {
      const response = await fetch(url, options);
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
      return data;
    })();

    if (method === "GET" && !noCache) {
      publicInflight.set(cacheKey, inflightPromise);
    }

    return await inflightPromise;
  } catch (err) {
    publicInflight.delete(cacheKey);
    if (err?.name === "TypeError") {
      markApiOffline(err, "api.fetchPublic");
    }
    throw err;
  }
}
