import type { PublicPersona } from "./types";

const RESERVED_SLUGS = new Set(["external", "index", "new", "edit", "api", "admin"]);

function parseLinkUrls(persona: Pick<PublicPersona, "website" | "links">): string[] {
  const urls: string[] = [];
  if (persona.website) urls.push(persona.website);
  let links = persona.links;
  if (typeof links === "string") {
    try {
      links = JSON.parse(links);
    } catch {
      links = [];
    }
  }
  if (Array.isArray(links)) {
    for (const item of links) {
      if (item && typeof item === "object" && typeof item.url === "string") {
        urls.push(item.url);
      }
    }
  }
  return urls;
}

/** Extract a clean, URL-safe X/Twitter handle to use as a readable author slug. */
export function extractTwitterHandle(persona: Pick<PublicPersona, "website" | "links">): string | undefined {
  for (const raw of parseLinkUrls(persona)) {
    try {
      const parsed = new URL(raw.trim());
      const host = parsed.hostname.toLowerCase();
      if (host !== "x.com" && host !== "www.x.com" && host !== "twitter.com" && host !== "www.twitter.com" && host !== "mobile.twitter.com") {
        continue;
      }
      const first = parsed.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "");
      if (!first || !/^[A-Za-z0-9_]{2,30}$/.test(first)) continue;
      if (RESERVED_SLUGS.has(first.toLowerCase())) continue;
      if (["intent", "search", "hashtag", "home", "i", "share", "status"].includes(first.toLowerCase())) continue;
      return first;
    } catch {
      // Ignore invalid URLs.
    }
  }
  return undefined;
}

/** Build a collision-free id -> slug map for a list of personas. */
export function buildAuthorSlugMap(personas: ReadonlyArray<Pick<PublicPersona, "id" | "website" | "links">>): Map<string, string> {
  const counts = new Map<string, number>();
  const rawHandles = new Map<string, string>();
  for (const persona of personas) {
    const handle = extractTwitterHandle(persona);
    if (!handle) continue;
    const key = handle.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    rawHandles.set(persona.id, handle);
  }
  const map = new Map<string, string>();
  for (const [id, handle] of rawHandles) {
    if (counts.get(handle.toLowerCase()) === 1) {
      map.set(id, handle);
    }
  }
  return map;
}

export function authorHref(id: string, slug?: string | null): string {
  return `/author/${encodeURIComponent(slug || id)}`;
}

export function findPersonaByIdOrSlug<T extends Pick<PublicPersona, "id" | "website" | "links">>(
  personas: ReadonlyArray<T>,
  idOrSlug: string,
): T | undefined {
  const direct = personas.find((p) => p.id === idOrSlug);
  if (direct) return direct;
  const needle = idOrSlug.toLowerCase();
  const slugs = buildAuthorSlugMap(personas);
  for (const persona of personas) {
    const slug = slugs.get(persona.id);
    if (slug && slug.toLowerCase() === needle) return persona;
  }
  return undefined;
}
