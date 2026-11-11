"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Clapperboard, FileText, Gamepad2, Headphones, Search } from "lucide-react";
import { PublicAvatarImage } from "@/components/PublicAvatarImage";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicImage } from "@/components/PublicImage";
import { PublicTopBar } from "@/components/PublicTopBar";
import { ResourceAgeGate, useResourceAgeGate } from "@/components/ResourceAgeGate";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { publicAvatarColor } from "@/components/publicAvatarColor";
import { ResourceSubmissionDialog } from "@/components/ResourceSubmissionDialog";
import type { ProductionRole, PublicPersona, PublicProductionCredit } from "@/lib/types";

type Category = "voice_actor" | "post_production" | "cover_art" | "recording_studio";
const CATEGORIES: { key: Category; label: string }[] = [
  { key: "voice_actor", label: "聲演" },
  { key: "post_production", label: "後製" },
  { key: "cover_art", label: "封面" },
  { key: "recording_studio", label: "錄音室" },
];
const DIRECTORY_TAG_CLASS = "[font-size:var(--public-font-caption)] px-2 py-0.5 rounded-md border border-border/40 bg-muted/40 text-muted-foreground";

function actorProfileLinks(persona: PublicPersona): Array<{ label: string; url: string }> {
  let links = persona.links;
  if (typeof links === "string") {
    try { links = JSON.parse(links); } catch { links = []; }
  }
  const entries = [
    ...(persona.website ? [{ label: "個人網站", url: persona.website }] : []),
    ...(Array.isArray(links) ? links : []),
  ];
  const seen = new Set<string>();
  return entries.filter((entry): entry is { label: string; url: string } => {
    if (!entry || typeof entry !== "object" || typeof entry.url !== "string") return false;
    let url: URL;
    try { url = new URL(entry.url); } catch { return false; }
    if (!["https:", "http:"].includes(url.protocol) || seen.has(url.href)) return false;
    seen.add(url.href);
    return true;
  }).map((entry) => ({ label: entry.label?.trim() || "個人頁", url: entry.url }));
}

function ActorTags({ tags, onSelect }: { tags: string[]; onSelect: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tags : tags.slice(0, 3);
  return <div className={`flex gap-1.5 ${expanded ? "flex-wrap" : "overflow-hidden"}`}>
    {visible.map((tag) => <button key={tag} type="button" onClick={() => onSelect(tag)} className={`${DIRECTORY_TAG_CLASS} shrink-0 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground`}>{tag}</button>)}
    {tags.length > 3 && <button type="button" onClick={() => setExpanded(!expanded)} className={`${DIRECTORY_TAG_CLASS} shrink-0 transition-colors hover:border-primary/40 hover:text-primary`}>{expanded ? "收合" : `更多（${tags.length - 3}）`}</button>}
  </div>;
}

/** One person with production roles, as listed in the resource directory; the row links to their identity page. */
export interface ProductionResource {
  id: string;
  personaId: string;
  name: string;
  categories: ProductionRole[];
  otherRoles?: string[];
  summary: string;
  bio?: string;
  avatarUrl?: string;
  websiteUrl: string;
  links?: Array<{ label?: string; url: string }>;
  /** Addresses of the retired /resources/<id> pages that now redirect to this identity. */
  legacyIds?: string[];
  works: PublicProductionCredit[];
}

function resourceLinks(item: ProductionResource): Array<{ label: string; url: string }> {
  const seen = new Set<string>();
  return [
    ...(item.websiteUrl ? [{ label: "官方／委託頁", url: item.websiteUrl }] : []),
    ...(item.links || []).map((link) => ({ label: link.label || "連結", url: link.url })),
  ].filter((link) => {
    if (!/^https?:\/\//i.test(link.url) || seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

function ResourceWorks({ works }: {
  works: ProductionResource["works"];
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  if (works.length === 0) return null;
  return <section className="min-w-0 border-t border-border/50 px-2.5 pb-2 pt-1.5 sm:px-3 sm:pb-3 sm:pt-2" aria-label="參與作品">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="[font-size:var(--public-font-caption)] font-medium text-muted-foreground">參與作品</h3>
      {works.length > 3 && <div className="flex gap-1">
        <button type="button" onClick={() => laneRef.current?.scrollBy({ left: -216, behavior: "smooth" })} aria-label="往左瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
        <button type="button" onClick={() => laneRef.current?.scrollBy({ left: 216, behavior: "smooth" })} aria-label="往右瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"><ChevronRight className="h-4 w-4" aria-hidden /></button>
      </div>}
    </div>
    <div ref={laneRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" aria-label="橫向瀏覽參與作品">
      {works.map((work, index) => <a key={`${work.id}-${work.creditRole}`} href={work.url} target="_blank" rel="noopener noreferrer" className="group block w-20 shrink-0 snap-start sm:w-24" aria-label={`前往作品：${work.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border/70 bg-muted">
          {work.coverUrl ? <PublicImage src={work.coverUrl} alt={`${work.title}封面`} preset="script-cover" sizes="96px" eager={index < 3} /> : work.workType === "game" ? <Gamepad2 className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/60" aria-hidden /> : work.workType === "video" ? <Clapperboard className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/60" aria-hidden /> : work.workType === "other" ? <FileText className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/60" aria-hidden /> : <Headphones className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/60" aria-hidden />}
        </div>
        <span className="mt-1 line-clamp-2 [font-size:var(--public-font-caption)] leading-snug text-muted-foreground group-hover:text-primary">{work.title}</span>
      </a>)}
    </div>
  </section>;
}

export function ResourcesClient({ initialPersonas, initialResources, refreshOnMount = false }: {
  initialPersonas: PublicPersona[];
  initialResources: ProductionResource[];
  refreshOnMount?: boolean;
}) {
  const [personas, setPersonas] = useState(initialPersonas);
  const [resources, setResources] = useState(initialResources);
  const [category, setCategory] = useState<Category>("voice_actor");
  const [query, setQuery] = useState("");
  const { confirmed: ageConfirmed, ready: ageGateReady, confirm: confirmAge } = useResourceAgeGate();

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("category");
    if (CATEGORIES.some((item) => item.key === requested)) setCategory(requested as Category);
  }, []);

  useEffect(() => {
    if (!refreshOnMount) return;
    let active = true;
    void readPublicBundle<{ personas?: PublicPersona[]; productionResources?: ProductionResource[] }>(["personas", "productionResources"])
      .then(({ data }) => {
        if (!active) return;
        if (Array.isArray(data.personas)) setPersonas(data.personas);
        if (Array.isArray(data.productionResources)) setResources(data.productionResources);
      }).catch(() => {});
    return () => { active = false; };
  }, [refreshOnMount]);

  const needle = query.trim().toLocaleLowerCase();
  const actors = useMemo(() => personas.filter((persona) => !persona.voiceActorHidden && persona.roles?.includes("voice_actor"))
    .filter((persona) => !needle || `${persona.displayName} ${persona.bio || ""} ${(persona.tags || []).join(" ")}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hant")), [personas, needle]);
  const listings = useMemo(() => resources.filter((item) => category !== "voice_actor" && item.categories.includes(category)
      && item.works.some((work) => work.creditRole === category))
    .filter((item) => !needle || `${item.name} ${item.summary}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => b.works.filter((work) => work.creditRole === category).length - a.works.filter((work) => work.creditRole === category).length
      || a.name.localeCompare(b.name, "zh-Hant")), [resources, category, needle]);
  const visibleCount = category === "voice_actor" ? actors.length : listings.length;

  function selectCategory(next: Category) {
    setCategory(next);
    const url = new URL(window.location.href);
    if (next === "voice_actor") url.searchParams.delete("category");
    else url.searchParams.set("category", next);
    window.history.replaceState({}, "", url);
  }

  return <div className="flex min-h-screen flex-col bg-background">
    <PublicTopBar activeTab="resources" />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-7 pt-4 sm:px-6 sm:pt-7 lg:px-8">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:mb-5 sm:flex sm:items-end sm:justify-between">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">資源</h1>
          <span className="text-xs text-muted-foreground sm:text-sm">{visibleCount} 筆</span>
        </div>
        <div className="col-start-2 row-start-1 sm:order-2"><ResourceSubmissionDialog defaultCategory={category} /></div>
        <label className="relative col-span-2 block w-full sm:order-1 sm:ml-auto sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/65" aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-lg border border-border/60 bg-background/70 pl-9 pr-3 [font-size:var(--public-font-meta)] outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15 sm:h-10" placeholder="搜尋資源" aria-label="搜尋資源" />
        </label>
      </div>
      {ageGateReady && !ageConfirmed && <ResourceAgeGate onConfirm={confirmAge} />}
      <nav aria-label="資源類別" className="sticky top-[82px] z-30 -mx-4 mb-3 flex gap-1 overflow-x-auto border-b border-border/50 bg-background/95 px-4 py-1.5 backdrop-blur-md sm:top-14 sm:mx-0 sm:mb-5 sm:gap-1.5 sm:px-0">
        {CATEGORIES.map((item) => <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => selectCategory(item.key)} className={`h-8 shrink-0 rounded-md border px-2.5 [font-size:var(--public-font-caption)] font-medium transition-colors ${category === item.key ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/50 bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"}`}>{item.label}</button>)}
      </nav>
      {visibleCount === 0 ? <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-14 text-center text-sm text-muted-foreground">{needle ? "找不到符合的資源。" : "這個類別正在收錄中。"}</div> :
        <div className="grid gap-2 min-[480px]:grid-cols-2 sm:gap-2.5 lg:grid-cols-3">
          {category === "voice_actor" ? actors.map((persona) => <article key={persona.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)]">
            <a href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} className="flex min-w-0 items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full sm:h-12 sm:w-12"><PublicAvatarImage src={persona.avatar} name={persona.displayName} sizes="48px" fallbackClassName={publicAvatarColor(persona.displayName)} /></div>
              <div className="min-w-0 flex-1"><p className="truncate font-medium [font-size:var(--public-font-body)]">{persona.displayName}</p>{persona.bio && <p className="mt-0.5 line-clamp-1 [font-size:var(--public-font-caption)] leading-relaxed text-muted-foreground sm:line-clamp-2">{persona.bio}</p>}</div>
            </a>
            {(Boolean(persona.tags?.length) || actorProfileLinks(persona).length > 0) && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 pb-2 sm:px-3 sm:pb-3">
            {Boolean(persona.tags?.length) && <ActorTags tags={persona.tags!} onSelect={setQuery} />}
            {actorProfileLinks(persona).length > 0 && <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {actorProfileLinks(persona).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-7 items-center gap-1 rounded-md border border-border/50 bg-background/70 px-2 [font-size:var(--public-font-caption)] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 sm:min-h-8 sm:px-2.5" aria-label={`${persona.displayName}的${link.label}`}>{link.label}<ArrowUpRight className="h-3 w-3" aria-hidden /></a>)}
            </div>}
            </div>}
          </article>) : listings.map((item) => <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)]">
            <a href={`/author/${encodeURIComponent(item.personaId || item.id)}`} aria-label={`${item.name}的個人頁`} className="flex min-w-0 items-center gap-2.5 p-2.5 hover:text-primary sm:gap-3 sm:p-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full sm:h-12 sm:w-12"><PublicAvatarImage src={item.avatarUrl} name={item.name} sizes="48px" fallbackClassName={publicAvatarColor(item.name)} /></div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium [font-size:var(--public-font-body)]">{item.name}</h2>
                <p className="mt-0.5 [font-size:var(--public-font-caption)] text-muted-foreground">{item.works.filter((work) => work.creditRole === category).length} 部參與作品</p>
                {ageConfirmed && item.bio && <p className="mt-0.5 line-clamp-1 [font-size:var(--public-font-caption)] leading-relaxed text-muted-foreground sm:line-clamp-2">{item.bio}</p>}
              </div>
            </a>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 pb-2 sm:px-3">
              {item.categories.map((role) => <span key={role} className={DIRECTORY_TAG_CLASS}>{CATEGORIES.find((entry) => entry.key === role)?.label}</span>)}
              {item.otherRoles?.includes("voice_actor") && <span className={DIRECTORY_TAG_CLASS}>聲演</span>}
              {item.otherRoles?.includes("scriptwriter") && <span className={DIRECTORY_TAG_CLASS}>台本師</span>}
              {resourceLinks(item).length > 0 && <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {resourceLinks(item).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border/50 bg-background/70 px-2.5 [font-size:var(--public-font-caption)] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5">{link.label}<ArrowUpRight className="h-3 w-3" aria-hidden /></a>)}
              </div>}
            </div>
            {ageConfirmed && <ResourceWorks works={(item.works || []).filter((work) => work.creditRole === category)} />}
          </article>)}
        </div>}
    </main>
    <PublicFooter />
  </div>;
}
