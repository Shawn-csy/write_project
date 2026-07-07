"use client";

import { useMemo } from "react";
import type { PublicPersona, PublicScript } from "@/lib/types";
import { buildAuthorEntityModel } from "@/lib/publicEntityPageModel";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { PublicImage } from "@/components/PublicImage";

interface Props {
  persona: PublicPersona & {
    bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
    avatarCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  };
  scripts: PublicScript[];
}

function parseLinks(
  links: PublicPersona["links"]
): Array<{ url?: string; label?: string }> {
  if (Array.isArray(links)) return links;
  if (typeof links === "string") {
    try {
      const parsed = JSON.parse(links);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getLinkIcon(url = ""): string {
  const u = url.toLowerCase();
  if (u.includes("twitter.com") || u.includes("x.com")) return "𝕏";
  if (u.includes("instagram.com")) return "IG";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YT";
  if (u.includes("github.com")) return "GH";
  return "🔗";
}

export function AuthorPageClient({ persona, scripts }: Props) {
  const model = buildAuthorEntityModel(persona, scripts);
  const links = parseLinks(persona.links);

  // Derive series list from scripts
  const authorSeries = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; coverUrl: string | null }
    >();
    for (const s of scripts) {
      const name = s.series?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      if (!map.has(key))
        map.set(key, { name, count: 0, coverUrl: s.series?.coverUrl ?? null });
      const bucket = map.get(key)!;
      bucket.count += 1;
      if (!bucket.coverUrl && s.coverUrl) bucket.coverUrl = s.coverUrl;
    }
    return Array.from(map.values());
  }, [scripts]);

  return (
    <main className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-r from-slate-900 to-slate-700">
        {persona.bannerUrl && (
          <PublicImage src={persona.bannerUrl} alt="" preset="author-banner" crop={persona.bannerCrop} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="w-full px-3 sm:px-5 lg:px-8 pb-20">
        {/* Profile header */}
        <div className="relative -mt-16 mb-8 rounded-xl border border-border/60 bg-background p-6 shadow-sm md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-background bg-muted overflow-hidden shrink-0 shadow">
              {persona.avatar ? (
                <PublicImage src={persona.avatar} alt={persona.displayName} preset="avatar" crop={persona.avatarCrop} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                  {persona.displayName?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 pt-2">
              <h1 className="text-3xl font-bold font-serif">{persona.displayName}</h1>

              {/* Org links */}
              {persona.organizations && persona.organizations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {persona.organizations.map((org) => (
                    <a
                      key={org.id}
                      href={`/org/${org.id}`}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      🏢 {org.name}
                    </a>
                  ))}
                </div>
              )}

              {persona.bio && (
                <p className="text-foreground/85 leading-relaxed max-w-2xl">
                  {persona.bio}
                </p>
              )}

              {model.profileTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">作者標籤</p>
                  <div className="flex flex-wrap gap-2">
                    {model.profileTags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {persona.website && (
                  <a
                    href={persona.website}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground underline"
                  >
                    🔗 {persona.website}
                  </a>
                )}
                {links
                  .filter((l) => l.url)
                  .map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground underline"
                    >
                      {getLinkIcon(link.url)} {link.label || link.url}
                    </a>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Series block */}
        {authorSeries.length > 0 && (
          <section className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <h2 className="text-xl font-bold">系列作品</h2>
              <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                {authorSeries.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {authorSeries.map((series) => (
                <a
                  key={series.name}
                  href={`/series/${encodeURIComponent(series.name)}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 hover:border-primary/50 transition-colors"
                >
                  {series.coverUrl && (
                    <div className="relative w-10 h-14 rounded border border-border/50 shrink-0 overflow-hidden">
                      <PublicImage src={series.coverUrl} alt={series.name} preset="thumbnail" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{series.name}</p>
                    <p className="text-xs text-muted-foreground">{series.count} 部</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Scripts */}
        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <h2 className="text-xl font-bold">公開作品</h2>
            <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
              {scripts.length}
            </span>
          </div>
          {scripts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              目前沒有公開作品
            </p>
          ) : (
            <EntityScriptGrid scripts={scripts} />
          )}
        </section>
      </div>
    </main>
  );
}
