"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicAvatarImage } from "@/components/PublicAvatarImage";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicTopBar } from "@/components/PublicTopBar";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { getPublicVoicePerformances, hasVoiceActorSelfTag } from "@/lib/publicVoicePerformances";
import type { ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";

interface Props {
  initialPersonas: PublicPersona[];
  initialDemos: PublicDemoSubmission[];
  initialScripts: PublicScript[];
  initialExternalScripts: ExternalPublicScript[];
  refreshOnMount?: boolean;
}

function socialLinks(persona: PublicPersona): Array<{ label: string; url: string }> {
  const links = Array.isArray(persona.links) ? persona.links : [];
  const unique = new Set<string>();
  return links.filter((item) => {
    const url = String(item.url || "").trim();
    if (!/^https:\/\//i.test(url) || unique.has(url)) return false;
    unique.add(url);
    return true;
  }).map((item) => ({ label: String(item.label || "社群"), url: String(item.url) }));
}

export function VoiceActorDirectoryClient({ initialPersonas, initialDemos, initialScripts, initialExternalScripts, refreshOnMount = false }: Props) {
  const [personas, setPersonas] = useState(initialPersonas);
  const [demos, setDemos] = useState(initialDemos);
  const [scripts, setScripts] = useState(initialScripts);
  const [externalScripts, setExternalScripts] = useState(initialExternalScripts);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!refreshOnMount) return;
    let active = true;
    void readPublicBundle<{ personas?: PublicPersona[]; scripts?: PublicScript[]; externalPublicScripts?: ExternalPublicScript[]; demoSubmissions?: PublicDemoSubmission[] }>(["personas", "scripts", "externalPublicScripts", "demoSubmissions"])
      .then(({ data }) => {
        if (!active) return;
        if (Array.isArray(data.personas)) setPersonas(data.personas);
        if (Array.isArray(data.scripts)) setScripts(data.scripts);
        if (Array.isArray(data.externalPublicScripts)) setExternalScripts(data.externalPublicScripts);
        if (Array.isArray(data.demoSubmissions)) setDemos(data.demoSubmissions);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [refreshOnMount]);

  const performanceCounts = useMemo(() => {
    const bundle = { scripts, externalPublicScripts: externalScripts, demoSubmissions: demos };
    return new Map(personas.map((persona) => [persona.id, getPublicVoicePerformances(persona.id, bundle).length]));
  }, [personas, scripts, externalScripts, demos]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return personas.filter((persona) => !persona.voiceActorHidden && (persona.roles?.includes("voice_actor") ?? (hasVoiceActorSelfTag(persona)
      || (performanceCounts.get(persona.id) || 0) > 0)))
      .filter((persona) => !needle || `${persona.displayName} ${persona.bio || ""} ${(persona.tags || []).join(" ")}`.toLocaleLowerCase().includes(needle))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hant"));
  }, [personas, performanceCounts, query]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopBar activeTab="resources" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <PublicBrowseHeader title="聲演" count={`${visible.length} 位`} actions={
          <label className="relative block w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-border/70 bg-card pl-9 pr-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" placeholder="搜尋聲演" aria-label="搜尋聲演" />
          </label>
        } />

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-14 text-center text-sm text-muted-foreground">{query.trim() ? "找不到符合的聲演。" : "目前還沒有公開聲演身份。"}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((persona) => {
              const socials = socialLinks(persona);
              return (
                <article key={persona.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/40 p-3 transition-colors hover:border-primary/40">
                  <a href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} aria-label={`${persona.displayName}身份頁`} className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    <PublicAvatarImage src={persona.avatar} name={persona.displayName} sizes="48px" />
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <a href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} className="truncate font-semibold hover:text-primary">{persona.displayName}</a>
                    </div>
                    {persona.bio && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{persona.bio}</p>}
                    {socials.length > 0 && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{socials.slice(0, 3).map((social) => <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{social.label}<ExternalLink className="h-3 w-3" aria-hidden /></a>)}</div>}
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
