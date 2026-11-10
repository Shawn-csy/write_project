"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Headphones, Search } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicImage } from "@/components/PublicImage";
import { PublicTopBar } from "@/components/PublicTopBar";
import { AudioWorkSubmissionDialog } from "@/components/AudioWorkSubmissionDialog";
import { AudioWorkAdApplicationDialog } from "@/components/AudioWorkAdApplicationDialog";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { audioWorkTime, sortAudioWorks, type AudioWorkSortOrder } from "@/lib/audioWorkSorting";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";

type AudioBundle = { audioWorks?: PublicAudioWork[]; organizations?: PublicOrg[] };
const isFreeWork = (work: PublicAudioWork) => work.accessType === "free";
const WORKS_PER_PAGE = 18;
const BEDTIME_ORG_ID = "39189f92-73b3-47fd-8f59-343f9367a443";
const BEDTIME_OFFICIAL_LINKS = [
  { label: "官網", url: "https://bedtimestoryasmr.com/" },
  { label: "被談聲聆 · DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01001551.html" },
  { label: "夜來聲聆 · DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01001621.html" },
  { label: "小點聲聆 · DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01036219.html" },
] as const;
const NEON_VOICE_ORG_ID = "87048680-532d-40db-9450-16617351b77b";
const NEON_VOICE_OFFICIAL_LINKS = [
  { label: "DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG65763.html" },
  { label: "YouTube", url: "https://www.youtube.com/@neonvoice4531" },
  { label: "X", url: "https://x.com/neon_voice" },
] as const;
const PURELYSILK_ORG_ID = "b10dfcb3-ea6b-5ad0-8d5e-f3ff6cb3f533";
const PURELYSILK_OFFICIAL_LINKS = [
  { label: "官網", url: "https://purelysilkvoice.com/" },
  { label: "X", url: "https://x.com/purelysilkvoice" },
  { label: "DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01009187.html" },
] as const;
const HRLAB_ORG_ID = "0fc64473-8492-5197-8cbd-76eaf58b2e2c";
const HRLAB_OFFICIAL_LINKS = [
  { label: "X", url: "https://x.com/hrlab2024kl" },
  { label: "Portaly", url: "https://portaly.cc/hclab" },
  { label: "DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01012045.html/?locale=zh_TW" },
  { label: "CxC", url: "https://cxc.today/zh/@honglian" },
] as const;
const SECRET_YAMAR_ORG_ID = "6b0b3a47-b8ce-59e6-96fa-88c4ece26f4a";
const SECRET_YAMAR_OFFICIAL_LINKS = [
  { label: "DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01024116.html" },
  { label: "X", url: "https://x.com/secretyamar" },
] as const;
const FRAGRANT_LILY_ORG_ID = "9355832b-fa33-52fe-80c4-abeaf75d929a";
const FRAGRANT_LILY_OFFICIAL_LINKS = [
  { label: "CxC", url: "https://cxc.today/zh/@fragrantlily/work" },
  { label: "Portaly", url: "https://portaly.cc/fragrant_lily" },
  { label: "X", url: "https://x.com/fragrant_lily_" },
] as const;
const MAN_RESEARCH_ORG_ID = "1e9da030-1391-5ce9-b7ba-43e03a7f75eb";
const MAN_RESEARCH_OFFICIAL_LINKS = [
  { label: "官網", url: "https://www.manresearch11.com/" },
  { label: "CxC", url: "https://cxc.today/zh/@man_research11/work" },
  { label: "X", url: "https://x.com/man_research11" },
] as const;
const WANWAN_VOICE_ORG_ID = "017321d5-7587-5bb8-bd61-42c5709f81b7";
const WANWAN_VOICE_OFFICIAL_LINKS = [
  { label: "DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG74042.html" },
  { label: "X", url: "https://x.com/wanwan_voice" },
  { label: "YouTube", url: "https://www.youtube.com/@wanwan_voice" },
] as const;

export function AudioWorksClient({ initialWorks, initialOrganizations, refreshOnMount = false }: { initialWorks: PublicAudioWork[]; initialOrganizations: PublicOrg[]; refreshOnMount?: boolean }) {
  // Confirm on each visit; the choice is intentionally not persisted between pages.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [works, setWorks] = useState(initialWorks);
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [loaded, setLoaded] = useState(!refreshOnMount || initialWorks.length > 0 || initialOrganizations.length > 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<AudioWorkSortOrder>("newest");
  const [randomizedOrgIds, setRandomizedOrgIds] = useState<string[]>([]);
  const [studioQuery, setStudioQuery] = useState("");
  const [workQuery, setWorkQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(WORKS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncSelection = () => setSelectedId(new URLSearchParams(window.location.search).get("organization"));
    syncSelection();
    window.addEventListener("popstate", syncSelection);
    return () => window.removeEventListener("popstate", syncSelection);
  }, []);

  useEffect(() => {
    if (!refreshOnMount) return;
    let active = true;
    void readPublicBundle<AudioBundle>(["audioWorks", "organizations"])
      .then(({ data }) => {
        if (!active) return;
        if (Array.isArray(data.audioWorks)) setWorks(data.audioWorks);
        if (Array.isArray(data.organizations)) setOrganizations(data.organizations);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [refreshOnMount]);

  const groups = useMemo(() => {
    const orgById = new Map(organizations.map((org) => [org.id, org]));
    const grouped = new Map<string, { org: PublicOrg; works: PublicAudioWork[] }>();
    const unassigned: PublicAudioWork[] = [];
    for (const work of works) {
      const org = work.organizationId ? orgById.get(work.organizationId) : undefined;
      if (!org) { unassigned.push(work); continue; }
      const group = grouped.get(org.id) || { org, works: [] };
      group.works.push(work);
      grouped.set(org.id, group);
    }
    for (const group of grouped.values()) group.works = sortAudioWorks(group.works, sortOrder);
    return { grouped: [...grouped.values()], unassigned: sortAudioWorks(unassigned, sortOrder) };
  }, [organizations, works, sortOrder]);

  const organizationIds = groups.grouped.map(({ org }) => org.id).join("|");
  useEffect(() => {
    const ids = organizationIds ? organizationIds.split("|") : [];
    setRandomizedOrgIds((previous) => {
      const current = new Set(ids);
      const retained = previous.filter((id) => current.has(id));
      const known = new Set(retained);
      const added = ids.filter((id) => !known.has(id));
      for (let index = added.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [added[index], added[swap]] = [added[swap], added[index]];
      }
      return [...retained, ...added];
    });
  }, [organizationIds]);

  const visibleGroups = useMemo(() => {
    const rank = new Map(randomizedOrgIds.map((id, index) => [id, index]));
    const query = studioQuery.trim().toLocaleLowerCase();
    return groups.grouped
      .filter(({ org }) => !query || org.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => (rank.get(a.org.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.org.id) ?? Number.MAX_SAFE_INTEGER));
  }, [groups.grouped, randomizedOrgIds, studioQuery]);

  const selected = selectedId ? groups.grouped.find((group) => group.org.id === selectedId) : undefined;
  const filteredWorks = useMemo(() => {
    if (!selected) return [];
    const query = workQuery.trim().toLocaleLowerCase();
    if (!query) return selected.works;
    return selected.works.filter((work) =>
      work.title.toLocaleLowerCase().includes(query)
      || work.voiceActors?.some((actor) => actor.name.toLocaleLowerCase().includes(query))
    );
  }, [selected, workQuery]);
  useEffect(() => {
    if (!ageConfirmed || !selected || visibleCount >= filteredWorks.length) return;
    const target = loadMoreRef.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisibleCount(filteredWorks.length);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setVisibleCount((count) => Math.min(count + WORKS_PER_PAGE, filteredWorks.length));
    }, { rootMargin: "300px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [ageConfirmed, selected?.org.id, filteredWorks.length, visibleCount]);
  const officialLinks = selected?.org.id === BEDTIME_ORG_ID ? BEDTIME_OFFICIAL_LINKS
    : selected?.org.id === NEON_VOICE_ORG_ID ? NEON_VOICE_OFFICIAL_LINKS
    : selected?.org.id === PURELYSILK_ORG_ID ? PURELYSILK_OFFICIAL_LINKS
    : selected?.org.id === HRLAB_ORG_ID ? HRLAB_OFFICIAL_LINKS
    : selected?.org.id === SECRET_YAMAR_ORG_ID ? SECRET_YAMAR_OFFICIAL_LINKS
    : selected?.org.id === FRAGRANT_LILY_ORG_ID ? FRAGRANT_LILY_OFFICIAL_LINKS
    : selected?.org.id === MAN_RESEARCH_ORG_ID ? MAN_RESEARCH_OFFICIAL_LINKS
    : selected?.org.id === WANWAN_VOICE_ORG_ID ? WANWAN_VOICE_OFFICIAL_LINKS
    : [];
  const select = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("organization", id);
    else url.searchParams.delete("organization");
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedId(id);
    setWorkQuery("");
    setVisibleCount(WORKS_PER_PAGE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicTopBar activeTab="audio-works" />
      {!ageConfirmed ? (
        <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-12 sm:px-6">
          <section aria-labelledby="audio-age-warning" className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <span className="text-xs font-semibold tracking-widest text-red-500">R18</span>
            <h1 id="audio-age-warning" className="mt-2 font-serif text-2xl font-bold">成人向內容提醒</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">音聲作品頁包含成人向作品與封面，僅供年滿 18 歲者瀏覽。</p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setAgeConfirmed(true)} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">我已年滿 18 歲，進入頁面</button>
              <a href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-muted">返回首頁</a>
            </div>
          </section>
        </main>
      ) : (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            {selected && <button type="button" onClick={() => select(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted" aria-label="返回音聲作品總覽"><ArrowLeft className="h-4 w-4" /></button>}
            <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">{selected?.org.name || "音聲作品"}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AudioWorkSubmissionDialog organizations={organizations} />
            <AudioWorkAdApplicationDialog />
          </div>
        </div>

        {!loaded ? (
          <div className="grid gap-4" aria-label="載入作品">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-xl bg-muted/70" />)}</div>
        ) : selected ? (
          <section aria-label={`${selected.org.name}的作品`}>
            {selected.org.description && <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{selected.org.description}</p>}
            {officialLinks.length > 0 && (
              <nav aria-label={`${selected.org.name}官方連結`} className="mb-6 flex flex-wrap gap-2">
                {officialLinks.map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary sm:text-sm">
                    {link.label}<ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ))}
              </nav>
            )}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <label className="relative block w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input type="search" value={workQuery} onChange={(event) => { setWorkQuery(event.target.value); setVisibleCount(WORKS_PER_PAGE); }} placeholder="搜尋作品或聲演" aria-label="搜尋作品或聲演" className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground" />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                時間排序
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as AudioWorkSortOrder)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
                  <option value="newest">最新優先</option>
                  <option value="oldest">最舊優先</option>
                </select>
              </label>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">{workQuery ? `找到 ${filteredWorks.length} 件作品` : `共 ${selected.works.length} 件作品`}</p>
            {filteredWorks.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {filteredWorks.slice(0, visibleCount).map((work) => <AudioWorkCard key={work.id} work={work} />)}
            </div> : <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">找不到符合的作品或聲演。</p>}
            {filteredWorks.length > visibleCount && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
          </section>
        ) : selectedId ? (
          <section className="rounded-xl border border-border/70 p-8 text-center">
            <p>找不到這個組織的公開作品。</p>
            <button type="button" onClick={() => select(null)} className="mt-4 text-sm text-primary hover:underline">返回總覽</button>
          </section>
        ) : works.length === 0 ? (
          <section className="rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
            <Headphones className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
            <h2 className="mt-4 text-base font-semibold">目前沒有公開作品</h2>
          </section>
        ) : (
          <div className="space-y-8">
            <section aria-label="音聲作品組織">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-sm font-semibold">探索社團</p><p className="mt-1 text-xs text-muted-foreground">{groups.grouped.length} 間社團 · {works.length} 件作品 · 社團順序隨機呈現</p></div>
                <label className="relative block w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input type="search" value={studioQuery} onChange={(event) => setStudioQuery(event.target.value)} placeholder="搜尋社團" aria-label="搜尋社團" className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground" />
                </label>
              </div>
              {visibleGroups.length > 0 ? <div className="grid gap-4 md:grid-cols-2">
              {visibleGroups.map(({ org, works: orgWorks }) => {
                const banner = org.bannerUrl;
                return <button type="button" key={org.id} onClick={() => select(org.id)} className="group flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/50 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span className="relative block aspect-[2.4/1] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-background">
                    {banner ? <PublicImage src={banner} alt={`${org.name}橫幅`} preset="org-banner" crop={org.bannerCrop} /> : <span className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_75%_25%,hsl(var(--primary)/0.22),transparent_50%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))] text-center"><span className="space-y-2"><Headphones className="mx-auto h-7 w-7 text-primary/70" aria-hidden /><span className="block px-4 font-serif text-2xl font-semibold tracking-wide text-foreground/85">{org.name}</span></span></span>}
                  </span>
                  <span className="flex flex-1 flex-col gap-2 px-5 py-4">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="text-lg font-semibold sm:text-xl">{org.name}</span><span className="text-xs text-muted-foreground">{orgWorks.length} 件作品</span></span>
                    {org.description && <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{org.description}</span>}
                    <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">查看作品 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </span>
                </button>;
              })}
              </div> : <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">找不到符合的社團。</p>}
            </section>
            {groups.unassigned.length > 0 && <section aria-labelledby="other-audio-works">
              <h2 id="other-audio-works" className="mb-4 text-sm font-semibold">其他公開作品</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">{groups.unassigned.map((work) => <AudioWorkCard key={work.id} work={work} />)}</div>
            </section>}
          </div>
        )}
      </main>
      )}
      <PublicFooter />
    </div>
  );
}

function AudioWorkCard({ work }: { work: PublicAudioWork }) {
  const isAdultWork = /成人向|R18/i.test(`${work.title}\n${work.description}`);
  const introduction = (work.description || "").split("\n").filter((line) =>
    !work.credits?.length || !/^\s*[【〔]?(?:聲演|聲優|声優|配音|CV|台本|劇本|脚本|シナリオ|封面|插畫|イラスト|後製|後期|混音|錄音|音效|聲音導演|音樂|配樂|美術|設計|標題設計|導演|監修|原著|原案|製作|共同製作|企劃|企画|制作|其他演出)(?:[・／/、+＆&](?:後製|後期|錄音|配音))?[】〕]?\s*[：:|｜]/i.test(line)
  ).join("\n").trim();
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {work.coverUrl ? <PublicImage src={work.coverUrl} alt={`${work.title}封面`} preset="script-cover" /> : <div className="flex h-full items-center justify-center"><Headphones className="h-9 w-9 text-muted-foreground/50" aria-hidden /></div>}
        {isAdultWork && <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 [font-size:var(--public-font-caption)] font-bold text-white">成人向</span>}
        {isFreeWork(work) && <span className="absolute right-2 top-2 rounded bg-slate-900/85 px-1.5 py-0.5 [font-size:var(--public-font-caption)] font-bold text-white">免費版</span>}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{work.title}</h3>
        {work.creatorName && <p className="mt-1 text-xs text-muted-foreground">{work.creatorName}</p>}
        {work.publishedAt != null && <time className="mt-1 block text-xs text-muted-foreground" dateTime={new Date(work.publishedAt).toISOString()}>{work.url.includes("cxc.today/") ? (work.url.includes("/track/") ? "CxC 上架 " : "CxC 更新 ") : "發售 "}{new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Taipei" }).format(work.publishedAt)}</time>}
        {Boolean(work.voiceActors?.length) && <p className="mt-1 flex flex-wrap gap-x-1 text-xs text-muted-foreground">聲演：{work.voiceActors!.map((actor, index) => <span key={actor.id}>{index > 0 ? "、" : ""}<a href={`/author/${actor.id}`} className="text-primary hover:underline">{actor.name}</a></span>)}</p>}
        <a href={work.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm">前往作品頁 <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
        {(Boolean(work.credits?.length) || introduction) && <details className="mt-3 border-t border-border/60 pt-2 text-xs text-muted-foreground sm:text-sm">
          <summary className="cursor-pointer font-medium text-foreground">製作人員與介紹</summary>
          {Boolean(work.credits?.length) && <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 leading-relaxed">{work.credits!.map((credit, index) => <div className="contents" key={`${credit.role}-${credit.creditedAs}-${index}`}><dt className="whitespace-nowrap text-muted-foreground">{credit.sourceRole}</dt><dd className="break-words text-foreground">{credit.creditedAs}{credit.provenance === "catalog_description" && <span className="ml-1 text-muted-foreground/70">（本站原有資料）</span>}</dd></div>)}</dl>}
          {work.credits?.some((credit) => credit.provenance === "official_page") && <a href={work.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-primary hover:underline">核對來源 ↗</a>}
          {introduction && <p className="mt-3 whitespace-pre-line break-words leading-relaxed">{introduction}</p>}
        </details>}
      </div>
    </article>
  );
}
