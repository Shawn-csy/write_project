export type ExternalEntityKind = "author" | "org";

/**
 * Return a short, stable URL token for an imported author or organization.
 * Social profile handles are preferred because they are unique and readable;
 * a website host, ASCII name, or short deterministic fallback is used when a
 * social URL is unavailable.
 */
export function externalEntitySlug(name: string, profileUrl?: string | null): string {
  const slugify = (value: string, preserveUnderscore = false) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(preserveUnderscore ? /[^A-Za-z0-9_-]+/g : /[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 64);

  const urlToken = (() => {
    const raw = String(profileUrl || "").trim();
    if (!raw) return "";
    try {
      const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
      const segments = parsed.pathname.split("/").filter(Boolean);
      return segments.length > 0
        ? slugify(segments.at(-1) || "", true)
        : slugify(parsed.hostname.replace(/^www\./i, ""));
    } catch {
      return slugify(raw.split("/").filter(Boolean).at(-1) || "", true);
    }
  })();
  if (urlToken) return urlToken;

  const nameToken = slugify(String(name || ""));
  if (nameToken) return nameToken;

  // FNV-1a keeps the fallback deterministic without exposing the full name.
  let hash = 2166136261;
  for (const char of String(name || "")) {
    hash ^= char.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return `entity-${(hash >>> 0).toString(36)}`;
}

export function externalEntityHref(
  kind: ExternalEntityKind,
  name: string,
  profileUrl?: string | null,
): string {
  const base = kind === "author" ? "/author/external" : "/org/external";
  return `${base}/${encodeURIComponent(externalEntitySlug(name, profileUrl))}`;
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
