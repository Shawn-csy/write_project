"use client";

import { useDirectoryRenderLimit } from "@/lib/useDirectoryRenderLimit";

import { useEffect, useMemo, useState } from "react";

import { PublicSearchField } from "@/components/PublicSearchField";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { PublicIdentityDirectoryRow } from "@/components/PublicIdentityDirectoryRow";
import { AdultContentNotice } from "@/components/AdultContentNotice";
import { useResourceAgeGate } from "@/lib/useResourceAgeGate";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { ResourceSubmissionDialog } from "@/components/ResourceSubmissionDialog";
import type { PublicPersona } from "@/lib/types";

import { buildResourceDirectory, selectResourceDirectory, type ProductionResource, type ResourceCategory as Category, type ResourceDirectoryEntry } from "@/lib/resourceDirectory";
import { PARTICIPATION_ROLE_LABELS } from "@write/public-ui/participation-roles";

export type { ProductionResource } from "@/lib/resourceDirectory";
const CATEGORIES: { key: Category; label: string }[] = [
  { key: "voice_actor", label: "聲演" },
  { key: "post_production", label: "後製" },
  { key: "cover_art", label: "封面" },
  { key: "recording_engineer", label: "錄音師" },
  { key: "recording_studio", label: "錄音室" },
  { key: "recording_unclassified", label: "待分類錄音" },
];

export function ResourcesClient({ initialDirectory, refreshOnMount = false }: {
  initialDirectory: ResourceDirectoryEntry[];
  refreshOnMount?: boolean;
}) {
  const [directory, setDirectory] = useState(initialDirectory);
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
        if (active && Array.isArray(data.personas) && Array.isArray(data.productionResources)) {
          setDirectory(buildResourceDirectory(data.personas, data.productionResources));
        }
      }).catch(() => {});
    return () => { active = false; };
  }, [refreshOnMount]);

  const needle = query.trim().toLocaleLowerCase();
  const hasUnclassifiedRecording = useMemo(() => selectResourceDirectory(directory, "recording_unclassified", "").length > 0, [directory]);
  const visibleCategories = hasUnclassifiedRecording ? CATEGORIES : CATEGORIES.filter((item) => item.key !== "recording_unclassified");
  const listings = useMemo(() => selectResourceDirectory(directory, category, query), [directory, category, query]);
  const visibleCount = listings.length;
  const { limit: renderLimit, loadMoreRef } = useDirectoryRenderLimit(visibleCount, 8, JSON.stringify([category, needle]));

  useEffect(() => {
    if (category !== "recording_unclassified" || hasUnclassifiedRecording) return;
    setCategory("recording_engineer");
    const url = new URL(window.location.href);
    url.searchParams.set("category", "recording_engineer");
    window.history.replaceState({}, "", url);
  }, [category, hasUnclassifiedRecording]);

  function selectCategory(next: Category) {
    setCategory(next);
    const url = new URL(window.location.href);
    if (next === "voice_actor") url.searchParams.delete("category");
    else url.searchParams.set("category", next);
    window.history.replaceState({}, "", url);
  }

  return <div className="flex flex-1 flex-col bg-background">
    <PublicBrowseMain>
      <PublicBrowseHeader
        title="資源"
        count={`${visibleCount} 筆`}
        search={<PublicSearchField value={query} onChange={setQuery} placeholder="搜尋資源" />}
        actions={<ResourceSubmissionDialog defaultCategory={category} />}
      />
      {ageGateReady && !ageConfirmed && <div className="mb-4"><AdultContentNotice scope="participations" onConfirm={confirmAge} /></div>}
      <nav aria-label="資源類別" className="sticky top-[86px] z-30 -mx-4 flex gap-1 overflow-x-auto border-b-2 border-primary bg-background px-4 pt-1.5 sm:top-[57px] sm:mx-0 sm:px-0">
        {visibleCategories.map((item) => <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => selectCategory(item.key)} className="tab-item">{item.label}</button>)}
      </nav>
      {visibleCount === 0 ? <PublicEmptyState
        className="border-y border-border"
        title={needle ? "找不到符合的資源。" : "這個類別正在收錄中。"}
        primaryAction={needle ? { label: "清除搜尋", onClick: () => setQuery("") } : undefined}
      /> :
        <ul>
          {listings.slice(0, renderLimit).map((item) => {
            const { links, href } = item;
            const credited = item.works.filter((work) => work.creditRole === (category === "recording_engineer" || category === "recording_unclassified" ? "recording_studio" : category));
            return <li key={item.id}><PublicIdentityDirectoryRow
              name={item.name} href={href} avatar={item.avatar} bio={item.bio}
              works={credited}
              emptyLabel={category !== "voice_actor" && item.commissionRoles.includes(category === "recording_engineer" || category === "recording_unclassified" ? "recording_studio" : category) ? "提供委託資訊" : "尚無參與作品"}
              roleLabels={item.roles.map((role) => PARTICIPATION_ROLE_LABELS[role])}
              tags={item.tags.filter((tag) => !Object.values(PARTICIPATION_ROLE_LABELS).some((label) => label === tag))}
              onTagClick={setQuery} links={links} showWorks={ageConfirmed} /></li>;
          })}
        </ul>}
      {visibleCount > renderLimit && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
    </PublicBrowseMain>
  </div>;
}
