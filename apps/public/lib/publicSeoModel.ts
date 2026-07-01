/**
 * Canonical public SEO URL model.
 *
 * Single source of truth for:
 * - canonical route builders (used by generateMetadata and sitemap)
 * - indexability / sitemap eligibility rules
 *
 * Rules:
 * - Dynamic segment values are URI-encoded exactly once here; callers pass raw values.
 * - `/gallery` is retired — always excluded.
 * - Workspace/editor/admin routes are always disallowed.
 * - Tags are indexable but excluded from sitemap by default.
 */

import { BASE_URL } from "./seo";

// ─── Canonical URL builders ───────────────────────────────────────────────────

export function homeUrl(): string {
  return BASE_URL + "/";
}

export function readUrl(scriptId: string): string {
  return `${BASE_URL}/read/${encodeURIComponent(scriptId)}`;
}

export function authorUrl(personaId: string): string {
  return `${BASE_URL}/author/${encodeURIComponent(personaId)}`;
}

export function orgUrl(orgId: string): string {
  return `${BASE_URL}/org/${encodeURIComponent(orgId)}`;
}

export function seriesUrl(seriesName: string): string {
  return `${BASE_URL}/series/${encodeURIComponent(seriesName)}`;
}

export function tagUrl(tagName: string): string {
  return `${BASE_URL}/tag/${encodeURIComponent(tagName)}`;
}

export function staticPageUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalized}`;
}

// ─── Sitemap date helper ──────────────────────────────────────────────────────

/**
 * Converts an `updatedAt` value (ISO string, Unix ms number, or undefined) to
 * an ISO-8601 string safe for sitemap `lastModified`.
 *
 * Returns `fallback` (default: current time) when the value is absent or results
 * in an invalid Date, so a malformed backend value never throws during sitemap render.
 */
export function toSitemapDate(value: string | number | undefined, fallback = new Date().toISOString()): string {
  if (value == null) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

// ─── Static public pages ──────────────────────────────────────────────────────

/** Static pages that are always indexed and included in the sitemap. */
export const STATIC_PUBLIC_PAGES = ["/about", "/help", "/license", "/privacy", "/terms"] as const;

// ─── Sitemap eligibility ──────────────────────────────────────────────────────

/**
 * Returns true when the author URL for this persona should be included in the sitemap.
 *
 * Rule: only include canonical Persona IDs (not owner/account fallback IDs).
 * A persona is canonical when it has a persona ID distinct from the owner ID,
 * OR when we have no owner ID to compare against (treat as canonical).
 */
export function isPersonaSitemapEligible(personaId: string | undefined, ownerId: string | undefined): boolean {
  if (!personaId) return false;
  // If both IDs are present and identical, this is an owner fallback URL — exclude.
  if (ownerId && personaId === ownerId) return false;
  return true;
}

/**
 * Returns true when tag pages should be included in the sitemap.
 * Default: false — tags are thin aggregate pages; include only by explicit product decision.
 */
export function shouldIncludeTagsInSitemap(): boolean {
  return false;
}

/**
 * Returns true when the given route pattern is retired or workspace-only.
 * These routes must never appear in the sitemap.
 */
export function isExcludedRoute(pathname: string): boolean {
  const EXCLUDED_PREFIXES = [
    "/gallery",       // retired
    "/dashboard",
    "/studio",
    "/edit",
    "/settings",
    "/admin",
    "/api",
  ];
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}
