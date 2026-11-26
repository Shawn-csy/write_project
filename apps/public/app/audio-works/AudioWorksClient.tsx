"use client";

import { PublicContentLink } from "@/components/PublicDirectoryDetails";
import { LiveBannerStrip } from "@/components/LiveBannerStrip";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Headphones } from "lucide-react";
import { PublicSearchField } from "@/components/PublicSearchField";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicAudioWorkCard } from "@/components/PublicAudioWorkCard";
import { publicAudioPerformers } from "@/lib/publicWorkPerformers";
import { PublicOrgMasthead } from "@/components/PublicOrgMasthead";
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
import { sortAudioWorks, type AudioWorkSortOrder } from "@/lib/audioWorkSorting";
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
      || publicAudioPerformers(work).some((actor) => actor.name.toLocaleLowerCase().includes(query))
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
  const studioLinks = selected?.org.id === BEDTIME_ORG_ID ? BEDTIME_OFFICIAL_LINKS
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
  const officialLinks = studioLinks.length ? studioLinks : selected?.org.website
    ? [{ label: "官方網站", url: selected.org.website }]
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
        {selected ? (
          <PublicOrgMasthead org={selected.org} leading={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PublicBackButton label="返回音聲總覽" onClick={() => select(null)} />
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <AudioWorkSubmissionDialog organizations={organizations} />
                <AudioWorkAdApplicationDialog />
              </div>
            </div>
          }>
            {officialLinks.length > 0 && (
              <nav aria-label={`${selected.org.name}官方連結`} className="flex flex-wrap gap-2">
                {officialLinks.map((link) => (
                  <PublicContentLink key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" appearance="source" className="text-xs sm:text-sm" arrow>
                    {link.label}
                  </PublicContentLink>
                ))}
              </nav>
            )}
          </PublicOrgMasthead>
        ) : (
          <PublicBrowseHeader
            title="音聲"
            search={catalog && !selectedId && works.length > 0 ? (
              <PublicSearchField value={studioQuery} onChange={setStudioQuery} placeholder="搜尋社團" />
            ) : undefined}
            actions={<>
              {catalog && <AudioWorkSubmissionDialog organizations={organizations} />}
              <AudioWorkAdApplicationDialog />
            </>}
          />
        )}

        {loadFailed ? (
          <PublicEmptyState
            className="border-y border-border"
            title="無法載入音聲"
            primaryAction={{ label: "重新載入", onClick: () => { setLoadFailed(false); setLoadAttempt((attempt) => attempt + 1); } }}
          />
        ) : !catalog ? (
          <div className="grid gap-4" role="status" aria-label="載入作品">{Array.from({ length: 2 }, (_, index) => <div key={index} aria-hidden="true" className="h-48 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : selected ? (
          <section aria-label={`${selected.org.name}的作品`}>
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-2.5 sm:mb-4">
              <div className="mr-auto flex flex-wrap items-baseline gap-x-2">
                <h2 className="text-base font-semibold sm:text-lg">作品目錄</h2>
                <span className="text-xs text-muted-foreground" aria-live="polite">{workQuery ? `找到 ${filteredWorks.length} 件作品` : `共 ${selected.works.length} 件作品`}</span>
              </div>
              <div className="order-last w-full sm:order-none sm:max-w-60 sm:flex-1">
                <PublicSearchField value={workQuery} onChange={(next) => { setWorkQuery(next); setVisibleCount(WORKS_PER_PAGE); }} placeholder="搜尋作品或聲演" />
              </div>
              <PublicMorphDropdown label="時間排序" value={sortOrder} groups={AUDIO_SORT_GROUPS} onChange={setSortOrder} align="end" />
            </div>
            {filteredWorks.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {filteredWorks.slice(0, visibleCount).map((work, index) => <PublicAudioWorkCard key={work.id} work={work} organization={selected.org} highlightCover={index < 3} />)}
            </div> : <PublicEmptyState
              className="border-y border-border"
              title="找不到符合的作品或聲演。"
              primaryAction={workQuery.trim() ? { label: "清除搜尋", onClick: () => { setWorkQuery(""); setVisibleCount(WORKS_PER_PAGE); } } : undefined}
            />}
            {filteredWorks.length > visibleCount && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
          </section>
        ) : selectedId ? (
          <PublicEmptyState className="border-y border-border" title="找不到這個組織的公開作品。" primaryAction={{ label: "返回音聲總覽", onClick: () => select(null) }} />
        ) : works.length === 0 ? (
          <PublicEmptyState className="border-y border-border" title="目前沒有公開作品" icon={<Headphones className="h-5 w-5" aria-hidden />} />
        ) : (
          <div className="space-y-8">
            <section aria-label="音聲組織">
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
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{groups.unassigned.map((work) => <PublicAudioWorkCard key={work.id} work={work} />)}</div>
            </section>}
          </div>
        )}
      </PublicBrowseMain>
      </>
      )}
    </div>
  );
}
