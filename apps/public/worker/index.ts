/**
 * Public API Worker for the static Pages site.
 *
 * It carries API traffic only. Images never pass through here: the browser
 * reads them from the local media origin and, if that is down, from R2.
 *
 * Two roles, chosen by which binding is configured:
 *  - DB (D1): the read-only fallback. Answers the public GET routes from the
 *    last snapshot synced from the local backend. Writes are refused.
 *  - BACKEND_ORIGIN: a forwarding proxy to a running backend. Used while
 *    previewing, before the D1 snapshot exists.
 */

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

interface Env {
  DB?: D1Database;
  BACKEND_ORIGIN?: string;
  /** Comma-separated exact origins allowed to call this API from a browser. */
  ALLOWED_ORIGINS?: string;
  /**
   * "1" makes the forwarding proxy refuse writes. A dev site that forwards to the
   * live backend would otherwise bump real view counts and send real feedback.
   */
  READ_ONLY?: string;
}

interface SnapshotRow {
  body: string;
  synced_at: string;
}

const PUBLIC_READ_ROUTES = [
  /^\/api\/health\/ready$/,
  /^\/api\/public-bundle$/,
  /^\/api\/public-personas(?:\/[^/]+)?$/,
  /^\/api\/public-organizations(?:\/[^/]+)?$/,
  /^\/api\/public-terms-config$/,
  /^\/api\/public-scripts\/?$/,
  /^\/api\/public-scripts\/[^/]+$/,
  /^\/api\/themes\/public$/,
];

/** Reads that depend on the visitor or on live counters; a snapshot cannot answer them. */
const PROXY_ONLY_READ_ROUTES = [
  /^\/api\/public-scripts\/[^/]+\/like-status$/,
  /^\/api\/public-media(?:\/.*)?$/,
];

const PUBLIC_WRITE_ROUTES = [
  /^\/api\/public-feedback$/,
  /^\/api\/public-terms-acceptances$/,
  /^\/api\/public-scripts\/[^/]+\/like$/,
  /^\/api\/public-external-scripts\/[^/]+\/view$/,
  /^\/api\/scripts\/[^/]+\/view$/,
];

const SNAPSHOT_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

function isAllowedOrigin(origin: string, env: Env): boolean {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Data-Synced-At",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(origin, env)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function isReadRoute(pathname: string, snapshot: boolean): boolean {
  if (PUBLIC_READ_ROUTES.some((route) => route.test(pathname))) return true;
  return !snapshot && PROXY_ONLY_READ_ROUTES.some((route) => route.test(pathname));
}

function isAllowedRoute(pathname: string, method: string, snapshot: boolean): boolean {
  if (method === "GET" || method === "HEAD") return isReadRoute(pathname, snapshot);
  if (method === "POST") return PUBLIC_WRITE_ROUTES.some((route) => route.test(pathname));
  return false;
}

function plain(message: string, status: number, cors: Headers): Response {
  const headers = new Headers(cors);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(message, { status, headers });
}

async function serveSnapshot(request: Request, env: Env, cors: Headers): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "POST") {
    // The snapshot is a read-only copy: counters and feedback wait for the local backend.
    return plain("Read-only fallback", 503, cors);
  }
  const row = await env.DB!
    .prepare("SELECT body, synced_at FROM public_snapshot WHERE path = ?")
    .bind(`${url.pathname}${url.search}`)
    .first<SnapshotRow>();
  if (!row) return plain("Not found", 404, cors);

  const headers = new Headers(cors);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", SNAPSHOT_CACHE_CONTROL);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Data-Synced-At", row.synced_at);
  return new Response(request.method === "HEAD" ? null : row.body, { status: 200, headers });
}

async function proxyRequest(request: Request, env: Env, cors: Headers): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, env.BACKEND_ORIGIN);
  const headers = new Headers();
  for (const name of ["accept", "content-type", "if-none-match", "if-modified-since"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    ...(request.method === "GET" || request.method === "HEAD" ? {} : { body: request.body }),
    redirect: "manual",
  });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "cache-control", "etag", "last-modified", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const [name, value] of cors) responseHeaders.set(name, value);
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    const snapshot = Boolean(env.DB);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!isAllowedRoute(url.pathname, request.method, snapshot)) return plain("Not found", 404, cors);
    if (!snapshot && !env.BACKEND_ORIGIN) return plain("Public API is not configured", 503, cors);
    if (!snapshot && env.READ_ONLY === "1" && request.method === "POST") {
      return plain("This deployment is read-only", 503, cors);
    }

    try {
      return snapshot ? await serveSnapshot(request, env, cors) : await proxyRequest(request, env, cors);
    } catch {
      return plain("Public API unavailable", 502, cors);
    }
  },
};
