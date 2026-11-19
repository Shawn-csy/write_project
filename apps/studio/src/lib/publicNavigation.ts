import { publicSiteOrigin } from "./publicSiteUrl";

/** Cross-domain handoff from the studio to its matching public site. */

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
  const base = import.meta.env.VITE_PUBLIC_BASE_URL || publicSiteOrigin();
  return _buildPublicHref(base, path);
}

/**
 * Navigates the browser to a public-app path, crossing the Vite/Next boundary.
 */
export function openPublicPath(path: string): void {
  window.location.href = getPublicHref(path);
}
