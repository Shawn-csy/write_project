import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicScript } from "@/lib/types";
import { externalEntityHref } from "@/lib/externalEntity";
import {
  homeUrl,
  readUrl,
  authorUrl,
  orgUrl,
  seriesUrl,
  staticPageUrl,
  STATIC_PUBLIC_PAGES,
  isPersonaSitemapEligible,
  toSitemapDate,
} from "@/lib/publicSeoModel";
import { BASE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // regenerate hourly

function sitemapDateTimestamp(value: string | Date | undefined): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== "string") return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function dedupeSitemapEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const entriesByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) {
    const url = new URL(entry.url, BASE_URL).href;
    const normalizedEntry = { ...entry, url };
    const current = entriesByUrl.get(url);
    if (!current || sitemapDateTimestamp(entry.lastModified) >= sitemapDateTimestamp(current.lastModified)) {
      entriesByUrl.set(url, normalizedEntry);
    }
  }
  return Array.from(entriesByUrl.values());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all public scripts — they drive every dynamic URL in the sitemap.
  //
  // Important: do not silently fall back to a static-only sitemap. The public
  // reader's SEO contract depends on /read/* URLs being discoverable. Returning
  // a partial sitemap during a transient backend failure can be cached by
  // Next/nginx/crawlers and effectively hide every work page until the next
  // successful crawl.
  const [scripts, externalBundle] = await Promise.all([
    apiFetch<PublicScript[]>("/public-scripts"),
    apiFetch<{ externalPublicScripts?: ExternalPublicScript[] }>("/public-bundle"),
  ]);
  const externalScripts = Array.isArray(externalBundle?.externalPublicScripts)
    ? externalBundle.externalPublicScripts.filter((item) => item.status === "published")
    : [];

  const now = new Date().toISOString();

  // ── Static pages ────────────────────────────────────────────────────────────
  const staticEntries: MetadataRoute.Sitemap = [
    { url: homeUrl(), lastModified: now, changeFrequency: "daily", priority: 1.0 },
    ...STATIC_PUBLIC_PAGES.map((path) => ({
      url: staticPageUrl(path),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  // ── Script read pages ────────────────────────────────────────────────────────
  const scriptEntries: MetadataRoute.Sitemap = scripts.map((s) => ({
    url: readUrl(s.id),
    lastModified: toSitemapDate(s.updatedAt ?? s.lastModified, now),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // ── Author pages — canonical personas only ───────────────────────────────────
  const personaMap = new Map<string, string>(); // personaId → updatedAt
  for (const s of scripts) {
    const personaId = s.persona?.id;
    const ownerId = s.owner?.id;
    if (!personaId) continue;
    if (!isPersonaSitemapEligible(personaId, ownerId)) continue;
    const ts = toSitemapDate(s.updatedAt ?? s.lastModified, now);
    // Keep the most-recent timestamp for this persona.
    if (!personaMap.has(personaId) || ts > personaMap.get(personaId)!) {
      personaMap.set(personaId, ts);
    }
  }
  const authorEntries: MetadataRoute.Sitemap = Array.from(personaMap.entries()).map(([id, ts]) => ({
    url: authorUrl(id),
    lastModified: ts,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── Org pages ────────────────────────────────────────────────────────────────
  const orgMap = new Map<string, string>(); // orgId → updatedAt
  for (const s of scripts) {
    const orgId = s.organization?.id;
    if (!orgId) continue;
    const ts = toSitemapDate(s.updatedAt ?? s.lastModified, now);
    if (!orgMap.has(orgId) || ts > orgMap.get(orgId)!) {
      orgMap.set(orgId, ts);
    }
  }
  const orgEntries: MetadataRoute.Sitemap = Array.from(orgMap.entries()).map(([id, ts]) => ({
    url: orgUrl(id),
    lastModified: ts,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── Series pages ─────────────────────────────────────────────────────────────
  const seriesMap = new Map<string, string>(); // seriesName → updatedAt
  for (const s of scripts) {
    const name = s.series?.name;
    if (!name) continue;
    const ts = toSitemapDate(s.updatedAt ?? s.lastModified, now);
    if (!seriesMap.has(name) || ts > seriesMap.get(name)!) {
      seriesMap.set(name, ts);
    }
  }
  const seriesEntries: MetadataRoute.Sitemap = Array.from(seriesMap.entries()).map(([name, ts]) => ({
    url: seriesUrl(name),
    lastModified: ts,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // ── External author / organization pages ───────────────────────────────────
  const externalAuthorMap = new Map<string, { name: string; ts: string }>();
  const externalOrgMap = new Map<string, { name: string; ts: string }>();
  for (const item of externalScripts) {
    const ts = toSitemapDate(item.updatedAt ?? item.createdAt, now);
    if (item.authorName?.trim()) {
      const name = item.authorName.trim();
      const key = name.toLocaleLowerCase();
      const current = externalAuthorMap.get(key);
      if (!current || ts > current.ts) externalAuthorMap.set(key, { name, ts });
    }
    if (item.organizationName?.trim()) {
      const name = item.organizationName.trim();
      const key = name.toLocaleLowerCase();
      const current = externalOrgMap.get(key);
      if (!current || ts > current.ts) externalOrgMap.set(key, { name, ts });
    }
  }
  const externalAuthorEntries: MetadataRoute.Sitemap = Array.from(externalAuthorMap.values()).map(({ name, ts }) => ({
    url: `${BASE_URL}${externalEntityHref("author", name)}`,
    lastModified: ts,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  const externalOrgEntries: MetadataRoute.Sitemap = Array.from(externalOrgMap.values()).map(({ name, ts }) => ({
    url: `${BASE_URL}${externalEntityHref("org", name)}`,
    lastModified: ts,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Tags excluded by default (shouldIncludeTagsInSitemap() === false).

  return dedupeSitemapEntries([
    ...staticEntries,
    ...scriptEntries,
    ...authorEntries,
    ...orgEntries,
    ...externalAuthorEntries,
    ...externalOrgEntries,
    ...seriesEntries,
  ]);
}
