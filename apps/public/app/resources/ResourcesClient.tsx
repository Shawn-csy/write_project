"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicIdentityDirectoryRow } from "@/components/PublicIdentityDirectoryRow";
import { PublicTopBar } from "@/components/PublicTopBar";
import { ResourceAgeGate, useResourceAgeGate } from "@/components/ResourceAgeGate";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { ResourceSubmissionDialog } from "@/components/ResourceSubmissionDialog";
import type { PublicPersona } from "@/lib/types";

import { buildResourceDirectory, selectResourceDirectory, type ProductionResource, type ResourceCategory as Category } from "@/lib/resourceDirectory";
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
  const directory = useMemo(() => buildResourceDirectory(personas, resources), [personas, resources]);
  const hasUnclassifiedRecording = useMemo(() => selectResourceDirectory(directory, "recording_unclassified", "").length > 0, [directory]);
  const visibleCategories = hasUnclassifiedRecording ? CATEGORIES : CATEGORIES.filter((item) => item.key !== "recording_unclassified");
  const listings = useMemo(() => selectResourceDirectory(directory, category, query), [directory, category, query]);
  const visibleCount = listings.length;

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
        {visibleCategories.map((item) => <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => selectCategory(item.key)} className="tab-item">{item.label}</button>)}
      </nav>
      {visibleCount === 0 ? <p className="border-b border-border px-2 py-12 text-center text-sm text-muted-foreground">{needle ? "找不到符合的資源。" : "這個類別正在收錄中。"}</p> :
        <ul>
          {listings.map((item) => {
            const { links, href } = item;
            const credited = item.works.filter((work) => work.creditRole === (category === "recording_engineer" || category === "recording_unclassified" ? "recording_studio" : category));
            return <li key={item.id}><PublicIdentityDirectoryRow
              name={item.name} href={href} avatar={item.avatar} bio={item.bio}
              works={credited.map((work) => ({ ...work, id: `${work.id}-${work.creditRole}` }))}
              emptyLabel={category !== "voice_actor" && item.commissionRoles.includes(category === "recording_engineer" || category === "recording_unclassified" ? "recording_studio" : category) ? "提供委託資訊" : "尚無參與作品"}
              roleLabels={item.roles.map((role) => PARTICIPATION_ROLE_LABELS[role])}
              tags={item.tags.filter((tag) => !Object.values(PARTICIPATION_ROLE_LABELS).some((label) => label === tag))}
              onTagClick={setQuery} links={links} showWorks={ageConfirmed} /></li>;
          })}
        </ul>}
    </main>
    <PublicFooter />
  </div>;
}
