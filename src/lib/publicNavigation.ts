/**
 * publicNavigation.ts
 *
 * Single handoff point from Vite SPA → Next.js public app.
 *
 * In production, nginx routes public paths (/, /read/*, /author/*, etc.) to
 * the Next.js container on the same origin, so relative paths work fine.
 *
 * For split-domain deployments or local dev pointing at a separate Next.js
 * origin, set VITE_PUBLIC_BASE_URL (e.g. "https://public.example.com").
 * The helper then produces absolute URLs so every handoff lands on Next.
 *
 * All Vite → Next navigation MUST go through these functions.
 * Never use window.location.href = "/..." directly for public routes.
 */

/**
 * Pure core — exported for unit testing without env mocking.
 * @internal
 */
export function _buildPublicHref(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalizedPath;
  return base.replace(/\/$/, "") + normalizedPath;
}

/**
 * Returns the full URL for a public-app path.
 * path may be absolute-path style ("/read/abc") or missing the leading slash ("read/abc") —
 * both are normalized by _buildPublicHref.
 */
export function getPublicHref(path: string): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { VITE_PUBLIC_BASE_URL?: string } }).env
        ?.VITE_PUBLIC_BASE_URL) ||
    "";
  return _buildPublicHref(base, path);
}

/**
 * Navigates the browser to a public-app path, crossing the Vite/Next boundary.
 */
export function openPublicPath(path: string): void {
  window.location.href = getPublicHref(path);
}
