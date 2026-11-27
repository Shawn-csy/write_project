"use client";

import { useDirectoryRenderLimit } from "@/lib/useDirectoryRenderLimit";

import { useEffect, useMemo, useState } from "react";

import { PublicSearchField } from "@/components/PublicSearchField";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { AdultContentNotice } from "@/components/AdultContentNotice";
import { useResourceAgeGate } from "@/lib/useResourceAgeGate";
import { liveApi } from "@/lib/liveApi";
import { ResourceSubmissionDialog } from "@/components/ResourceSubmissionDialog";
import { ResourceDirectoryRow } from "./ResourceDirectoryRow";

import { selectResourceDirectory, type ResourceCategory as Category } from "@/lib/resourceDirectory";
import { buildResourceIndex, type ResourceIndexRow, type ResourceSummary } from "@/lib/resourceCatalog";
import { publicIdentityRoleLabel } from "@/lib/publicIdentityMetadata";

export type { ProductionResource } from "@/lib/resourceDirectory";
const CATEGORIES: { key: Category; label: string }[] = [
  { key: "voice_actor", label: "聲演" },
  { key: "post_production", label: "後製" },
  { key: "cover_art", label: publicIdentityRoleLabel("cover_art") },
  { key: "recording_engineer", label: "錄音師" },
  { key: "recording_studio", label: "錄音室" },
  { key: "recording_unclassified", label: "待分類錄音" },
];

export function ResourcesClient({ initialDirectory, refreshOnMount = false }: {
  initialDirectory: ResourceSummary[];
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
    const controller = new AbortController();
    void liveApi.readJson<ResourceIndexRow[]>("/api/public-resource-directory", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted && Array.isArray(data)) setDirectory(buildResourceIndex(data));
      }).catch(() => {});
    return () => controller.abort();
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
      <nav aria-label="資源類別" className="sticky top-[86px] z-30 flex flex-wrap gap-x-1 border-b border-border bg-background sm:top-[57px] sm:gap-x-2">
        {visibleCategories.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={category === item.key}
            onClick={() => selectCategory(item.key)}
            className="min-h-9 border-b-2 border-transparent px-2 text-xs font-medium text-muted-foreground hover:text-foreground aria-pressed:border-link aria-pressed:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-3 sm:text-sm"
          >
            {item.label}
          </button>
        ))}
      </nav>
      {visibleCount === 0 ? <PublicEmptyState
        className="border-y border-border"
        title={needle ? "找不到符合的資源。" : "這個類別正在收錄中。"}
        primaryAction={needle ? { label: "清除搜尋", onClick: () => setQuery("") } : undefined}
      /> :
        <ul>
          {listings.slice(0, renderLimit).map(item => <li key={item.id}>
            <ResourceDirectoryRow item={item} category={category} showWorks={ageConfirmed} onTagClick={setQuery} />
          </li>)}
        </ul>}
      {visibleCount > renderLimit && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
    </PublicBrowseMain>
  </div>;
}
