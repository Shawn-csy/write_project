"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, UserRound } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicImage } from "@/components/PublicImage";
import { PublicTopBar } from "@/components/PublicTopBar";
import { liveApi } from "@/lib/liveApi";
import { getPublicVoicePerformances, hasVoiceActorSelfTag } from "@/lib/publicVoicePerformances";
import type { ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";

interface Props {
  initialPersonas: PublicPersona[];
  initialDemos: PublicDemoSubmission[];
  initialScripts: PublicScript[];
  initialExternalScripts: ExternalPublicScript[];
}

function firstSocialLink(persona: PublicPersona): { label: string; url: string } | null {
  const links = Array.isArray(persona.links) ? persona.links : [];
  const item = links.find((link) => /^https:\/\//i.test(String(link.url || "")));
  if (!item?.url) return null;
  return { label: String(item.label || "社群"), url: item.url };
}

export function VoiceActorDirectoryClient({ initialPersonas, initialDemos, initialScripts, initialExternalScripts }: Props) {
  const [personas, setPersonas] = useState(initialPersonas);
  const [demos, setDemos] = useState(initialDemos);
  const [scripts, setScripts] = useState(initialScripts);
  const [externalScripts, setExternalScripts] = useState(initialExternalScripts);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    void liveApi.readJson<{ personas?: PublicPersona[]; scripts?: PublicScript[]; externalPublicScripts?: ExternalPublicScript[]; demoSubmissions?: PublicDemoSubmission[] }>("/api/public-bundle", { cache: "no-store" })
      .then(({ data }) => {
        if (!active) return;
        if (Array.isArray(data.personas)) setPersonas(data.personas);
        if (Array.isArray(data.scripts)) setScripts(data.scripts);
        if (Array.isArray(data.externalPublicScripts)) setExternalScripts(data.externalPublicScripts);
        if (Array.isArray(data.demoSubmissions)) setDemos(data.demoSubmissions);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return personas.filter((persona) => hasVoiceActorSelfTag(persona)
      || getPublicVoicePerformances(persona.id, { scripts, externalPublicScripts: externalScripts, demoSubmissions: demos }).length > 0)
      .filter((persona) => !needle || `${persona.displayName} ${persona.bio || ""} ${(persona.tags || []).join(" ")}`.toLocaleLowerCase().includes(needle))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hant"));
  }, [personas, scripts, externalScripts, demos, query]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopBar activeTab="voice-actors" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">演出者名錄</p>
            <h1 className="mt-1 font-serif text-3xl font-bold">聲演</h1>
            <p className="mt-2 text-sm text-muted-foreground">查看聲演身份與公開演出紀錄。</p>
          </div>
          <label className="relative block w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-border/70 bg-card pl-9 pr-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" placeholder="搜尋聲演" aria-label="搜尋聲演" />
          </label>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">聲演名錄</h2>
          <span className="text-xs text-muted-foreground">{visible.length} 位</span>
        </div>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-14 text-center text-sm text-muted-foreground">{query.trim() ? "找不到符合的聲演。" : "目前還沒有公開聲演身份。"}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((persona) => {
              const social = firstSocialLink(persona);
              const count = getPublicVoicePerformances(persona.id, { scripts, externalPublicScripts: externalScripts, demoSubmissions: demos }).length;
              return (
                <article key={persona.id} className="flex min-h-28 gap-3 rounded-xl border border-border/70 bg-card/40 p-3 transition-colors hover:border-primary/40">
                  <a href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} aria-label={`${persona.displayName}身份頁`} className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                    {persona.avatar ? <PublicImage src={persona.avatar} alt={persona.displayName} preset="avatar" sizes="56px" /> : <UserRound className="h-6 w-6" aria-hidden />}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <a href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} className="truncate font-semibold hover:text-primary">{persona.displayName}</a>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{count} 筆公開演出</span>
                    </div>
                    {persona.bio && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{persona.bio}</p>}
                    {social && <a href={social.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">{social.label}<ExternalLink className="h-3 w-3" aria-hidden /></a>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
