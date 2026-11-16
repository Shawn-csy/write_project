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
const DIRECTORY_TAG_CLASS = "[font-size:var(--public-font-caption)] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground";
const DIRECTORY_LINK_CLASS = "tap-grow inline-flex items-center gap-0.5 [font-size:var(--public-font-caption)] text-link hover:underline";
const DIRECTORY_AVATAR_CLASS = "relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-12 sm:w-12";

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
    {visible.map((tag) => <button key={tag} type="button" onClick={() => onSelect(tag)} className={`${DIRECTORY_TAG_CLASS} tap-grow shrink-0 hover:text-link hover:underline`}>{tag}</button>)}
    {tags.length > 3 && <button type="button" onClick={() => setExpanded(!expanded)} className="tap-grow shrink-0 [font-size:var(--public-font-caption)] text-link hover:underline">{expanded ? "收合" : `更多（${tags.length - 3}）`}</button>}
  </div>;
}

/** One person with production roles, as listed in the resource directory; the row links to their identity page. */
export interface ProductionResource {
  id: string;
  personaId: string;
  name: string;
  categories: ProductionRole[];
  commissionCategories?: ProductionRole[];
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
  return <section className="mt-2 min-w-0 sm:pl-[3.75rem]" aria-label="參與作品">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <h3 className="[font-size:var(--public-font-caption)] font-bold text-foreground">參與作品</h3>
      {works.length > 3 && <div className="flex gap-1">
        <button type="button" onClick={() => laneRef.current?.scrollBy({ left: -216, behavior: "smooth" })} aria-label="往左瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
        <button type="button" onClick={() => laneRef.current?.scrollBy({ left: 216, behavior: "smooth" })} aria-label="往右瀏覽作品" className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" aria-hidden /></button>
      </div>}
    </div>
    <div ref={laneRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" aria-label="橫向瀏覽參與作品">
      {works.map((work, index) => <a key={`${work.id}-${work.creditRole}`} href={work.url} target="_blank" rel="noopener noreferrer" className="group block w-20 shrink-0 snap-start sm:w-24" aria-label={`前往作品：${work.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-border bg-muted">
          {work.coverUrl ? <PublicImage src={work.coverUrl} alt={`${work.title}封面`} preset="script-cover" sizes="96px" eager={index < 3} /> : work.workType === "game" ? <Gamepad2 className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" aria-hidden /> : work.workType === "video" ? <Clapperboard className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" aria-hidden /> : work.workType === "other" ? <FileText className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" aria-hidden /> : <Headphones className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" aria-hidden />}
        </div>
        <span className="mt-1 line-clamp-2 [font-size:var(--public-font-caption)] leading-snug text-foreground group-hover:text-link group-hover:underline">{work.title}</span>
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
      && (item.works.some((work) => work.creditRole === category) || item.commissionCategories?.includes(category)))
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
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:mb-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">資源</h1>
          <span className="text-xs text-muted-foreground sm:text-sm">{visibleCount} 筆</span>
        </div>
        <div className="col-start-2 row-start-1 sm:order-2"><ResourceSubmissionDialog defaultCategory={category} /></div>
        <label className="relative col-span-2 block w-full sm:order-1 sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 [font-size:var(--public-font-meta)] outline-none focus:border-link" placeholder="搜尋資源" aria-label="搜尋資源" />
        </label>
      </div>
      {ageGateReady && !ageConfirmed && <ResourceAgeGate onConfirm={confirmAge} />}
      <nav aria-label="資源類別" className="sticky top-[86px] z-30 -mx-4 flex gap-1 overflow-x-auto border-b-2 border-primary bg-background px-4 pt-1.5 sm:top-[57px] sm:mx-0 sm:px-0">
        {CATEGORIES.map((item) => <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => selectCategory(item.key)} className="tab-item">{item.label}</button>)}
      </nav>
      {visibleCount === 0 ? <p className="border-b border-border px-2 py-12 text-center text-sm text-muted-foreground">{needle ? "找不到符合的資源。" : "這個類別正在收錄中。"}</p> :
        <ul className={category === "voice_actor" ? "grid lg:grid-cols-2 lg:gap-x-8" : ""}>
          {category === "voice_actor" ? actors.map((persona) => {
            const links = actorProfileLinks(persona);
            const href = persona.externalHref || `/author/${encodeURIComponent(persona.id)}`;
            return <li key={persona.id} className="flex min-w-0 gap-3 border-b border-border py-3">
              <a href={href} tabIndex={-1} aria-hidden className={DIRECTORY_AVATAR_CLASS}><PublicAvatarImage src={persona.avatar} name={persona.displayName} sizes="48px" fallbackClassName={publicAvatarColor(persona.displayName)} /></a>
              <div className="min-w-0 flex-1">
                <a href={href} className="font-bold [font-size:var(--public-font-body)] hover:text-link hover:underline">{persona.displayName}</a>
                {persona.bio && <p className="mt-0.5 line-clamp-2 [font-size:var(--public-font-caption)] leading-relaxed text-muted-foreground">{persona.bio}</p>}
                {(Boolean(persona.tags?.length) || links.length > 0) && <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {Boolean(persona.tags?.length) && <ActorTags tags={persona.tags!} onSelect={setQuery} />}
                  {links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className={DIRECTORY_LINK_CLASS} aria-label={`${persona.displayName}的${link.label}`}>{link.label}<ArrowUpRight className="h-3 w-3" aria-hidden /></a>)}
                </div>}
              </div>
            </li>;
          }) : listings.map((item) => {
            const links = resourceLinks(item);
            const href = `/author/${encodeURIComponent(item.personaId || item.id)}`;
            const credited = item.works.filter((work) => work.creditRole === category);
            return <li key={item.id} className="min-w-0 border-b border-border py-3">
              <div className="flex min-w-0 gap-3">
                <a href={href} tabIndex={-1} aria-hidden className={DIRECTORY_AVATAR_CLASS}><PublicAvatarImage src={item.avatarUrl} name={item.name} sizes="48px" fallbackClassName={publicAvatarColor(item.name)} /></a>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h2 className="font-bold [font-size:var(--public-font-body)]"><a href={href} aria-label={`${item.name}的個人頁`} className="hover:text-link hover:underline">{item.name}</a></h2>
                    <span className="[font-size:var(--public-font-caption)] text-muted-foreground">{credited.length ? `${credited.length} 部參與作品` : "提供委託資訊"}</span>
                  </div>
                  {ageConfirmed && item.bio && <p className="mt-0.5 line-clamp-2 [font-size:var(--public-font-caption)] leading-relaxed text-muted-foreground">{item.bio}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      {item.categories.map((role) => <span key={role} className={DIRECTORY_TAG_CLASS}>{CATEGORIES.find((entry) => entry.key === role)?.label}</span>)}
                      {item.otherRoles?.includes("voice_actor") && <span className={DIRECTORY_TAG_CLASS}>聲演</span>}
                      {item.otherRoles?.includes("scriptwriter") && <span className={DIRECTORY_TAG_CLASS}>台本師</span>}
                    </div>
                    {links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className={DIRECTORY_LINK_CLASS}>{link.label}<ArrowUpRight className="h-3 w-3" aria-hidden /></a>)}
                  </div>
                </div>
              </div>
              {ageConfirmed && <ResourceWorks works={credited} />}
            </li>;
          })}
        </ul>}
    </main>
    <PublicFooter />
  </div>;
}
