"use client";

import Link from "next/link";
import type { ExternalEntityKind } from "@/lib/externalEntity";
import { socialAvatarUrl } from "@/lib/externalEntity";
import type { ExternalPublicScript } from "@/lib/types";
import { ExternalPublicScriptCard } from "./ExternalPublicScriptSection";
import { GalleryHoverPreviewProvider } from "@write/public-ui";
import { LinkifiedText } from "./LinkifiedText";

interface Props {
  kind: ExternalEntityKind;
  name: string;
  bio?: string;
  profileUrl?: string;
  profileAvatarUrl?: string;
  items: ExternalPublicScript[];
}

export function ExternalEntityPage({ kind, name, bio, profileUrl, profileAvatarUrl, items }: Props) {
  const avatarUrl = profileAvatarUrl
    || (items[0] && (kind === "author" ? items[0].authorAvatarUrl : items[0].organizationAvatarUrl))
    || socialAvatarUrl(profileUrl);
  const isAuthor = kind === "author";
  const seriesGroups = Array.from(
    items.reduce((groups, item) => {
      const seriesName = item.seriesName?.trim();
      if (!seriesName) return groups;
      const key = seriesName.toLocaleLowerCase();
      const group = groups.get(key) || { name: seriesName, items: [] as ExternalPublicScript[] };
      group.items.push(item);
      groups.set(key, group);
      return groups;
    }, new Map<string, { name: string; items: ExternalPublicScript[] }>()).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));

  return (
    <main className="min-h-screen bg-background">
      <div className="relative h-40 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-800 to-primary/30 sm:h-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,hsl(var(--primary)/0.28),transparent_42%)]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
      </div>

      <div className="w-full px-3 pb-20 sm:px-5 lg:px-8">
        <section className="relative -mt-14 mb-8 rounded-xl border border-border/60 bg-background p-5 shadow-sm sm:-mt-16 sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className={`${isAuthor ? "rounded-full" : "rounded-xl"} relative h-24 w-24 shrink-0 overflow-hidden border-4 border-background bg-muted shadow sm:h-32 sm:w-32`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">{name.slice(0, 1)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="break-words font-serif text-3xl font-bold">{name}</h1>
              <LinkifiedText
                text={bio || "收錄於本站的外部公開台本作品"}
                className="whitespace-pre-line text-sm leading-6 text-muted-foreground"
              />
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{items.length} 部作品</span>
                {profileUrl && (
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {socialAvatarUrl(profileUrl) ? "𝕏 / Twitter" : "連結"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {seriesGroups.length > 0 && (
          <section className="mb-8 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-xl font-bold">系列作品</h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{seriesGroups.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {seriesGroups.map((series) => {
                const cover = series.items.find((item) => item.coverUrl);
                return (
                  <Link key={series.name} href={`/series/${encodeURIComponent(series.name)}`} className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 no-underline transition-colors hover:border-primary/50 hover:bg-background">
                    <div className="h-16 w-11 shrink-0 overflow-hidden rounded border bg-muted">
                      {cover ? <img src={`/api/public-media/external/${cover.id}`} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-muted-foreground">{series.name}</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-medium group-hover:text-primary">{series.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{series.items.length} 部作品</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-xl font-bold">公開作品</h2>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
          </div>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">目前沒有公開作品</p>
          ) : (
            <GalleryHoverPreviewProvider>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                {items.map((item) => <ExternalPublicScriptCard key={item.id} item={item} variant="standard" />)}
              </div>
            </GalleryHoverPreviewProvider>
          )}
        </section>
      </div>
    </main>
  );
}
