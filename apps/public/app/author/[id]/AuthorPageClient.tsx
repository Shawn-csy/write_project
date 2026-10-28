"use client";

import { useMemo } from "react";
import type { ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";
import { buildAuthorEntityModel } from "@/lib/publicEntityPageModel";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { PublicImage } from "@/components/PublicImage";
import { LinkifiedText } from "@/components/LinkifiedText";
import { ExternalLink } from "lucide-react";
import { hasVoiceActorSelfTag } from "@/lib/publicVoicePerformances";

interface Props {
  persona: PublicPersona & {
    bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
    avatarCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  };
  scripts: PublicScript[];
  performances?: PublicDemoSubmission[];
  externalScripts?: ExternalPublicScript[];
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

export function AuthorPageClient({ persona, scripts, performances = [], externalScripts = [] }: Props) {
  const model = buildAuthorEntityModel(persona, scripts);
  const links = parseLinks(persona.links);
  const isVoiceActor = hasVoiceActorSelfTag(persona) || performances.length > 0;
  const isScriptwriter = (persona.tags || []).some((tag) => /台本師|編劇|劇本師|腳本家|script\s*writer/i.test(String(tag)));
  const roles = [
    ...(scripts.length > 0 || isScriptwriter || externalScripts.length > 0 ? ["台本師"] : []),
    ...(isVoiceActor ? ["聲演"] : []),
  ];
  const externalWriterBio = externalScripts.find((script) => script.authorBio?.trim())?.authorBio?.trim() || "";
  const externalWriterUrl = externalScripts.find((script) => script.authorUrl?.trim())?.authorUrl?.trim() || "";
  const contactItems = [
    ...(persona.website
      ? [{ label: "網站", value: persona.website }]
      : []),
    ...links
      .filter((link) => String(link.url || "").trim())
      .map((link) => ({
        label: String(link.label || "聯絡方式").trim() || "聯絡方式",
        value: String(link.url || "").trim(),
      })),
  ];

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

              {roles.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="創作者身份">
                  {roles.map((role) => (
                    <span key={role} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {role}
                    </span>
                  ))}
                </div>
              )}

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
                <LinkifiedText
                  text={persona.bio}
                  className="text-foreground/85 leading-relaxed max-w-2xl"
                />
              )}

              {model.profileTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">個人標籤</p>
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

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {contactItems.map((item, i) => (
                  <span key={`${item.label}-${i}`} className="inline-flex items-baseline gap-1 break-all">
                    <span className="font-medium text-foreground/80">{item.label}：</span>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {externalScripts.length > 0 && (
          <>
            {(externalWriterBio || externalWriterUrl) && (
              <section className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
                <div className="mb-3 border-b border-border/60 pb-3">
                  <h2 className="text-xl font-bold">台本師資料</h2>
                  <p className="mt-1 text-xs text-muted-foreground">依公開台本的作者欄位比對此身份名稱</p>
                </div>
                {externalWriterBio && <LinkifiedText text={externalWriterBio} className="text-sm leading-relaxed text-foreground/85" />}
                {externalWriterUrl && <a href={externalWriterUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">查看台本師公開頁面<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
              </section>
            )}
            <section className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-xl font-bold">台本作品</h2>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{externalScripts.length} 部</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {externalScripts.map((script) => (
                  <article key={script.id} className="overflow-hidden rounded-lg border border-border/60 bg-background">
                    {script.coverUrl && <div className="relative aspect-[16/10] overflow-hidden bg-muted"><PublicImage src={script.coverUrl} alt={`${script.title}封面`} preset="script-cover" /></div>}
                    <div className="p-3">
                      <h3 className="line-clamp-2 text-sm font-semibold">{script.title || script.remoteTitle || "未命名台本"}</h3>
                      {script.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{script.summary}</p>}
                      <a href={script.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs hover:bg-muted/60">閱讀台本<ExternalLink className="h-3 w-3" aria-hidden /></a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {performances.length > 0 && (
          <section className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-xl font-bold">參與演出</h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{performances.length} 筆</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {performances.map((demo) => (
                <article key={demo.id} className="rounded-lg border border-border/60 bg-background p-3">
                  {demo.coverUrl && <div className="relative mb-3 aspect-video overflow-hidden rounded-md bg-muted"><PublicImage src={demo.coverUrl} alt={`${demo.demoName || "演出 Demo"}封面`} preset="script-cover" /></div>}
                  <p className="text-xs text-muted-foreground">{demo.scriptTitle}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold">{demo.demoName || "演出 Demo"}</h3>
                  {(demo.voiceTypes || []).length > 0 && <div className="mt-1 flex flex-wrap gap-1">{demo.voiceTypes!.map((type) => <span key={type} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{type === "male" ? "男聲演" : "女聲演"}</span>)}</div>}
                  {demo.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{demo.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={demo.scriptUrl} target={demo.scriptType === "external" ? "_blank" : undefined} rel={demo.scriptType === "external" ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs hover:bg-muted/60">看台本</a>
                    <a href={demo.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">播放 Demo<ExternalLink className="h-3 w-3" aria-hidden /></a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

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
        {(scripts.length > 0 || !isVoiceActor) && (
          <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-xl font-bold">公開作品</h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{scripts.length}</span>
            </div>
            {scripts.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">目前沒有公開作品</p> : <EntityScriptGrid scripts={scripts} />}
          </section>
        )}
      </div>
    </main>
  );
}
