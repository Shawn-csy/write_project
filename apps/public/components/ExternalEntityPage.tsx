"use client";

import { partitionContacts } from "@/lib/publicContactPrivacy";
import Link from "next/link";
import type { ExternalEntityKind } from "@/lib/externalEntity";
import { socialAvatarUrl } from "@/lib/externalEntity";
import type { ExternalPublicScript } from "@/lib/types";
import { ExternalPublicScriptCard } from "./ExternalPublicScriptSection";
import { GalleryHoverPreviewProvider } from "@write/public-ui";
import { LinkifiedText } from "./LinkifiedText";
import { publicApiUrl } from "@/lib/publicApiUrl";
import { externalCoverSrc } from "@/lib/externalCover";

interface Props {
  kind: ExternalEntityKind;
  name: string;
  bio?: string;
  profileUrl?: string;
  profileAvatarUrl?: string;
  authorKey?: string;
  externalAuthorId?: string;
  supplement?: NonNullable<ExternalPublicScript["authorSupplement"]>;
  contributors?: NonNullable<ExternalPublicScript["authorContributors"]>;
  items: ExternalPublicScript[];
}

export function ExternalEntityPage({ kind, name, bio, profileUrl, profileAvatarUrl, supplement, contributors = [], items }: Props) {
  const avatarUrl = profileAvatarUrl
    || (items[0] && (kind === "author" ? items[0].authorAvatarUrl : items[0].organizationAvatarUrl))
    || socialAvatarUrl(profileUrl);
  const isAuthor = kind === "author";
  // Email / Discord supplements are never published on the page unless explicitly marked public.
  const approvedLinks = partitionContacts(supplement?.links || []).visible;
  const approvedOrganizations = supplement?.organizations || [];
  const approvedWorks = supplement?.works || [];
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
      <div className="w-full px-3 pb-20 sm:px-5 lg:px-8">
        <section className="mb-8 border-b border-border pb-6 pt-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className={`rounded-md relative h-24 w-24 shrink-0 overflow-hidden border border-border bg-muted sm:h-28 sm:w-28`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">{name.slice(0, 1)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="break-words text-2xl font-bold">{name}</h1>
              <LinkifiedText
                text={bio || "收錄於本站的公開台本作品"}
                className="whitespace-pre-line text-sm leading-6 text-muted-foreground"
              />
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{items.length} 部作品</span>
                {profileUrl && (
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    {socialAvatarUrl(profileUrl) ? "𝕏 / Twitter" : "連結"}
                  </a>
                )}
              </div>
            </div>
          </div>
          {isAuthor && contributors.length > 0 && <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">資料協力者：{contributors.map((item) => item.name).filter(Boolean).join("、")}</p>}
        </section>

        {isAuthor && (approvedLinks.length > 0 || approvedOrganizations.length > 0 || approvedWorks.length > 0 || contributors.length > 0) && <section className="mb-8 space-y-5 border-t border-border pt-4">
          {approvedLinks.length > 0 && <div><h2 className="mb-2 font-semibold">社群連結</h2><div className="flex flex-wrap gap-3">{approvedLinks.map((link, index) => <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-link hover:underline">{link.label || link.url}</a>)}</div></div>}
          {approvedOrganizations.length > 0 && <div><h2 className="mb-2 font-semibold">所屬團體</h2><div className="grid gap-2 sm:grid-cols-2">{approvedOrganizations.map((org, index) => <article key={`${org.name}-${index}`} className="rounded-lg border border-border bg-background p-3"><strong className="text-sm">{org.name}</strong>{org.description && <p className="mt-1 text-xs text-muted-foreground">{org.description}</p>}{org.url && <a href={org.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs text-link hover:underline">{org.url}</a>}</article>)}</div></div>}
          {approvedWorks.length > 0 && <div><h2 className="mb-2 font-semibold">其他作品</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{approvedWorks.map((work, index) => <article key={`${work.title}-${index}`} className="overflow-hidden rounded-lg border border-border bg-background">{work.coverUrl && <img src={publicApiUrl(work.coverUrl)} alt="" className="aspect-video w-full object-cover" loading="lazy"/>}<div className="p-3"><strong className="text-sm">{work.title}</strong>{work.role && <p className="mt-1 text-xs text-muted-foreground">{work.role}</p>}{work.description && <p className="mt-1 text-xs text-muted-foreground">{work.description}</p>}{work.url && <a href={work.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-link hover:underline">查看作品</a>}</div></article>)}</div></div>}
        </section>}

        {seriesGroups.length > 0 && (
          <section className="mb-8">
            <div className="section-bar mb-4 flex items-baseline gap-2">
              <h2 className="text-[17px] font-bold">系列作品</h2>
              <span className="text-xs text-muted-foreground">{seriesGroups.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {seriesGroups.map((series) => {
                const cover = series.items.find((item) => item.coverUrl);
                return (
                  <Link key={series.name} href={`/series/${encodeURIComponent(series.name)}`} className="group flex items-center gap-3 rounded-lg border border-border bg-background p-3 no-underline hover:bg-background">
                    <div className="h-16 w-11 shrink-0 overflow-hidden rounded border bg-muted">
                      {cover ? <img src={publicApiUrl(externalCoverSrc(cover) ?? "")} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-muted-foreground">{series.name}</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-medium group-hover:text-link">{series.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{series.items.length} 部作品</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="section-bar mb-4 flex items-baseline gap-2">
            <h2 className="text-[17px] font-bold">公開作品</h2>
            <span className="text-xs text-muted-foreground">{items.length}</span>
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
