"use client";

import { LiveBannerStrip } from "@/components/LiveBannerStrip";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ExternalLink, Headphones } from "lucide-react";
import { PublicSearchField } from "@/components/PublicSearchField";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicBackButton } from "@/components/PublicBackButton";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { PublicMorphDropdown } from "@/components/PublicMorphDropdown";
import { AdultContentNotice } from "@/components/AdultContentNotice";
import { PublicImage } from "@/components/PublicImage";
import { AudioWorkSubmissionDialog } from "@/components/AudioWorkSubmissionDialog";
import { AudioWorkAdApplicationDialog } from "@/components/AudioWorkAdApplicationDialog";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { AUDIO_CATALOG_SECTIONS, AUDIO_CATALOG_SNAPSHOT, parseAudioCatalog, type AudioCatalog } from "@/lib/audioCatalog";
import { audioWorkTime, sortAudioWorks, type AudioWorkSortOrder } from "@/lib/audioWorkSorting";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";

async function loadAudioCatalog(): Promise<AudioCatalog> {
  try {
    const { data } = await readPublicBundle<unknown>(AUDIO_CATALOG_SECTIONS);
    return parseAudioCatalog(data);
  } catch (error) {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1") throw error;
    const snapshot = await fetch(AUDIO_CATALOG_SNAPSHOT, { cache: "no-cache", signal: AbortSignal.timeout(8000) });
    if (!snapshot.ok) throw new Error(`Audio catalog snapshot failed: ${snapshot.status}`);
    return parseAudioCatalog(await snapshot.json());
  }
}
const EMPTY_WORKS: PublicAudioWork[] = [];
const EMPTY_ORGANIZATIONS: PublicOrg[] = [];
const isFreeWork = (work: PublicAudioWork) => work.accessType === "free";
const WORKS_PER_PAGE = 18;
const AUDIO_SORT_GROUPS = [{ options: [
  { value: "newest", label: "最新優先" },
  { value: "oldest", label: "最舊優先" },
] satisfies { value: AudioWorkSortOrder; label: string }[] }];
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
const HANSEI_SAIWA_ORG_ID = "c089d422-41d7-5ccc-9cc0-f95b58ff5112";
const HANSEI_SAIWA_OFFICIAL_LINKS = [
  { label: "DLsite · BL", url: "https://www.dlsite.com/bl/circle/profile/=/maker_id/RG01023757.html" },
  { label: "DLsite · 乙女向", url: "https://www.dlsite.com/girls/circle/profile/=/maker_id/RG01023757.html" },
  { label: "Facebook · DLsite 女性向繁中", url: "https://www.facebook.com/girlsmaniax" },
  { label: "星良 · Instagram", url: "https://www.instagram.com/seira_st/" },
  { label: "星良 · X", url: "https://x.com/SeiRa_ST126" },
] as const;
const HANDORU_ORG_ID = "98f266a8-aa17-5463-a8e1-eef92ee91a3f";
const HANDORU_OFFICIAL_LINKS = [
  { label: "X", url: "https://x.com/HandoruClub" },
  { label: "DLsite", url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG63553.html" },
] as const;

export function AudioWorksClient() {
  // Confirm on each visit; the choice is intentionally not persisted between pages.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [catalog, setCatalog] = useState<AudioCatalog | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const works = catalog?.audioWorks ?? EMPTY_WORKS;
  const organizations = catalog?.organizations ?? EMPTY_ORGANIZATIONS;
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

  // Start the catalog request as soon as the age notice is interactive.
  useEffect(() => {
    let active = true;
    void loadAudioCatalog()
      .then((data) => { if (active) setCatalog(data); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [loadAttempt]);

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
    : selected?.org.id === HANSEI_SAIWA_ORG_ID ? HANSEI_SAIWA_OFFICIAL_LINKS
    : selected?.org.id === HANDORU_ORG_ID ? HANDORU_OFFICIAL_LINKS
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
    <div className="flex flex-1 flex-col bg-background">
      {!ageConfirmed ? (
        <PublicBrowseMain width="narrow">
          <AdultContentNotice scope="audio-works" onConfirm={() => setAgeConfirmed(true)} />
        </PublicBrowseMain>
      ) : (
      <>
      <LiveBannerStrip placement="audio-works" />
      <PublicBrowseMain>
        <PublicBrowseHeader
          title={selected?.org.name || "音聲作品"}
          leading={selected && <>
            <PublicBackButton label="返回音聲作品總覽" onClick={() => select(null)} />
            {selected.org.logoUrl && <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-card"><PublicImage src={selected.org.logoUrl} alt={`${selected.org.name}圖像`} preset="logo" /></span>}
          </>}
          search={selected ? (
            <PublicSearchField value={workQuery} onChange={(next) => { setWorkQuery(next); setVisibleCount(WORKS_PER_PAGE); }} placeholder="搜尋作品或聲演" />
          ) : catalog && !selectedId && works.length > 0 ? (
            <PublicSearchField value={studioQuery} onChange={setStudioQuery} placeholder="搜尋社團" />
          ) : undefined}
          actions={<>
            {catalog && <AudioWorkSubmissionDialog organizations={organizations} />}
            <AudioWorkAdApplicationDialog />
          </>}
        />

        {loadFailed ? (
          <PublicEmptyState
            className="border-y border-border"
            title="無法載入音聲作品"
            primaryAction={{ label: "重新載入", onClick: () => { setLoadFailed(false); setLoadAttempt((attempt) => attempt + 1); } }}
          />
        ) : !catalog ? (
          <div className="grid gap-4" role="status" aria-label="載入作品">{Array.from({ length: 2 }, (_, index) => <div key={index} aria-hidden="true" className="h-48 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : selected ? (
          <section aria-label={`${selected.org.name}的作品`}>
            {selected.org.description && <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{selected.org.description}</p>}
            {officialLinks.length > 0 && (
              <nav aria-label={`${selected.org.name}官方連結`} className="mb-6 flex flex-wrap gap-2">
                {officialLinks.map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted sm:text-sm">
                    {link.label}<ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ))}
              </nav>
            )}
            <div className="mb-4 flex justify-end">
              <PublicMorphDropdown label="時間排序" value={sortOrder} groups={AUDIO_SORT_GROUPS} onChange={setSortOrder} align="end" />
            </div>
            <p className="mb-4 text-xs text-muted-foreground">{workQuery ? `找到 ${filteredWorks.length} 件作品` : `共 ${selected.works.length} 件作品`}</p>
            {filteredWorks.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {filteredWorks.slice(0, visibleCount).map((work, index) => <AudioWorkCard key={work.id} work={work} highlightCover={index < 3} />)}
            </div> : <PublicEmptyState
              className="border-y border-border"
              title="找不到符合的作品或聲演。"
              primaryAction={workQuery.trim() ? { label: "清除搜尋", onClick: () => { setWorkQuery(""); setVisibleCount(WORKS_PER_PAGE); } } : undefined}
            />}
            {filteredWorks.length > visibleCount && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
          </section>
        ) : selectedId ? (
          <PublicEmptyState className="border-y border-border" title="找不到這個組織的公開作品。" primaryAction={{ label: "返回音聲作品總覽", onClick: () => select(null) }} />
        ) : works.length === 0 ? (
          <PublicEmptyState className="border-y border-border" title="目前沒有公開作品" icon={<Headphones className="h-5 w-5" aria-hidden />} />
        ) : (
          <div className="space-y-8">
            <section aria-label="音聲作品組織">
              {visibleGroups.length > 0 ? <div className="grid gap-4 md:grid-cols-2">
              {visibleGroups.map(({ org, works: orgWorks }) => {
                const banner = org.bannerUrl;
                const previewWorks = orgWorks.filter((work) => Boolean(work.coverUrl)).slice(0, 3);
                return <button type="button" key={org.id} onClick={() => select(org.id)} className="group flex w-full flex-col overflow-hidden rounded-md border border-border bg-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span className="relative block aspect-[2.4/1] w-full overflow-hidden bg-muted">
                    {banner ? <PublicImage src={banner} alt={`${org.name}橫幅`} preset="org-banner" crop={org.bannerCrop} /> : previewWorks.length > 0 ? (
                      <span className={`grid h-full ${previewWorks.length === 1 ? "grid-cols-1" : previewWorks.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {previewWorks.map((work) => <span key={work.id} className="relative min-w-0 overflow-hidden"><PublicImage src={work.coverUrl || ""} alt={`${work.title}封面預覽`} preset="org-banner" /></span>)}
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-9 text-xs font-medium text-white">代表作品封面</span>
                      </span>
                    ) : <span className="flex h-full items-center justify-center text-center"><span className="space-y-2"><Headphones className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden /><span className="block px-4 text-xl font-bold text-foreground">{org.name}</span></span></span>}
                    {org.logoUrl && <span className="absolute bottom-3 left-3 h-14 w-14 overflow-hidden rounded-md border border-border bg-white"><PublicImage src={org.logoUrl} alt={`${org.name}圖像`} preset="logo" /></span>}
                  </span>
                  <span className="flex flex-1 flex-col gap-2 px-5 py-4">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="text-lg font-semibold sm:text-xl">{org.name}</span><span className="text-xs text-muted-foreground">{orgWorks.length} 件作品</span></span>
                    {org.description && <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{org.description}</span>}
                    <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm text-link group-hover:underline">查看作品 <ArrowRight className="h-4 w-4" /></span>
                  </span>
                </button>;
              })}
              </div> : <PublicEmptyState
                className="border-y border-border"
                title="找不到符合的社團。"
                primaryAction={studioQuery.trim() ? { label: "清除搜尋", onClick: () => setStudioQuery("") } : undefined}
              />}
            </section>
            {groups.unassigned.length > 0 && <section aria-labelledby="other-audio-works">
              <h2 id="other-audio-works" className="mb-4 text-sm font-semibold">其他公開作品</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">{groups.unassigned.map((work) => <AudioWorkCard key={work.id} work={work} />)}</div>
            </section>}
          </div>
        )}
      </PublicBrowseMain>
      </>
      )}
    </div>
  );
}

function AudioWorkCard({ work, highlightCover = false }: { work: PublicAudioWork; highlightCover?: boolean }) {
  const isAdultWork = /成人向|R18/i.test(`${work.title}\n${work.description}`);
  const introduction = (work.description || "").split("\n").filter((line) =>
    !work.credits?.length || !/^\s*[【〔]?(?:聲演|聲優|声優|配音|CV|台本|劇本|脚本|シナリオ|封面|插畫|イラスト|後製|後期|混音|錄音|音效|聲音導演|音樂|配樂|美術|設計|標題設計|導演|監修|原著|原案|製作|共同製作|企劃|企画|制作|其他演出)(?:[・／/、+＆&](?:後製|後期|錄音|配音))?[】〕]?\s*[：:|｜]/i.test(line)
  ).join("\n").trim();
  return (
    <article className={`overflow-hidden rounded-xl border border-border bg-card ${highlightCover ? "public-featured-glare" : ""}`}>
      <div data-public-cover={Boolean(work.coverUrl) || undefined} className="relative aspect-[4/3] overflow-hidden bg-muted">
        {work.coverUrl ? <PublicImage src={work.coverUrl} alt={`${work.title}封面`} preset="script-cover" /> : <div className="flex h-full items-center justify-center"><Headphones className="h-9 w-9 text-muted-foreground/50" aria-hidden /></div>}
        {isAdultWork && <span className="absolute left-2 top-2 rounded-sm bg-seal px-1.5 py-0.5 [font-size:var(--public-font-caption)] font-bold text-white">成人向</span>}
        {isFreeWork(work) && <span className="absolute right-2 top-2 rounded bg-slate-900/85 px-1.5 py-0.5 [font-size:var(--public-font-caption)] font-bold text-white">免費版</span>}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{work.title}</h3>
        {work.creatorName && <p className="mt-1 text-xs text-muted-foreground">{work.creatorName}</p>}
        {work.publishedAt != null && <time className="mt-1 block text-xs text-muted-foreground" dateTime={new Date(work.publishedAt).toISOString()}>{work.url.includes("cxc.today/") ? (work.url.includes("/track/") ? "CxC 上架 " : "CxC 更新 ") : "發售 "}{new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Taipei" }).format(work.publishedAt)}</time>}
        {Boolean(work.voiceActors?.length) && <p className="mt-1 flex flex-wrap gap-x-1 text-xs text-muted-foreground">聲演：{work.voiceActors!.map((actor, index) => <span key={actor.id}>{index > 0 ? "、" : ""}<a href={`/author/${actor.id}`} className="text-link hover:underline">{actor.name}</a></span>)}</p>}
        <a href={work.url} target="_blank" rel="noopener noreferrer" className="public-arrow-link mt-3 inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline sm:text-sm">前往作品頁 <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
        {(Boolean(work.credits?.length) || introduction) && <details className="public-native-disclosure mt-3 border-t border-border pt-2 text-xs text-muted-foreground sm:text-sm">
          <summary className="cursor-pointer font-medium text-foreground">製作人員與介紹</summary>
          {Boolean(work.credits?.length) && <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 leading-relaxed">{work.credits!.map((credit, index) => <div className="contents" key={`${credit.role}-${credit.creditedAs}-${index}`}><dt className="whitespace-nowrap text-muted-foreground">{credit.sourceRole}</dt><dd className="break-words text-foreground">{credit.personaId ? <a href={`/author/${encodeURIComponent(credit.personaId)}`} className="text-link hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{credit.creditedAs}</a> : credit.creditedAs}{credit.provenance === "catalog_description" && <span className="ml-1 text-muted-foreground">（本站原有資料）</span>}</dd></div>)}</dl>}
          {work.credits?.some((credit) => credit.provenance === "official_page") && <a href={work.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-link hover:underline">核對來源 ↗</a>}
          {introduction && <p className="mt-3 whitespace-pre-line break-words leading-relaxed">{introduction}</p>}
        </details>}
      </div>
    </article>
  );
}
