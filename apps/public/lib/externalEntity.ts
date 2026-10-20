export type ExternalEntityKind = "author" | "org";

/**
 * Resolve the public profile route for an imported author or organization.
 * The display name stays readable in the URL while encodeURIComponent keeps
 * names containing punctuation or CJK characters safe.
 */
export function externalEntityHref(kind: ExternalEntityKind, name: string): string {
  const base = kind === "author" ? "/author/external" : "/org/external";
  return `${base}/${encodeURIComponent(name)}`;
}

/**
 * External avatars are materialized into this site's media library when an
 * admin refreshes an entry. Never call a third-party avatar resolver during a
 * normal public-page render; missing local media should remain a neutral
 * placeholder instead of causing rate limits.
 */
export function socialAvatarUrl(profileUrl?: string | null, cacheKey?: number | string | null): string {
  return "";
}

export function refreshableImageUrl(imageUrl?: string | null, cacheKey?: number | string | null): string {
  const value = String(imageUrl || "").trim();
  if (!value || cacheKey == null || !String(cacheKey)) return value;
  try {
    const parsed = new URL(value, "https://open-scripts.shawnup.com");
    parsed.searchParams.set("v", String(cacheKey));
    return /^https?:\/\//i.test(value) ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
}

export function formatExternalAddedAt(value?: number | string | null): string {
  if (value == null || value === "") return "";
  const timestamp = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
