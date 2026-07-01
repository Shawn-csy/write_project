/**
 * useGalleryFilterModel
 *
 * React hook: batched enrichment + all filter/lane/tag computation.
 * No router, no i18n, no auth — pure data processing.
 * Both Vite and Next.js can import this.
 */
import { useEffect, useMemo, useState } from "react";
import {
  enrichScript,
  filterGalleryScripts,
  buildFeaturedSeries,
  deriveTags,
  type GalleryScriptInput,
  type EnrichedGalleryScript,
  type FeaturedSeries,
  type GalleryFilterOptions,
  type AuthorLike,
  type OrgLike,
} from "./filterModel";

const BACKGROUND_ENRICH_THRESHOLD = 120;
const ENRICH_BATCH_SIZE = 60;

export interface UseGalleryFilterModelInput {
  scripts: GalleryScriptInput[];
  authors?: AuthorLike[];
  orgs?: OrgLike[];
  searchNeedle: string;
  selectedTags: string[];
  selectedAuthorTags?: string[];
  selectedOrgTags?: string[];
  segmentFilter: string;
  usageFilter: string;
}

export interface UseGalleryFilterModelResult {
  scriptsWithMeta: EnrichedGalleryScript[];
  filteredScripts: EnrichedGalleryScript[];
  topViewedScripts: EnrichedGalleryScript[];
  latestScripts: EnrichedGalleryScript[];
  featuredSeries: FeaturedSeries[];
  allTags: string[];
  licenseTagShortcuts: string[];
  filteredAuthors: AuthorLike[];
  filteredOrgs: OrgLike[];
  authorTags: string[];
  orgTags: string[];
}

export function useGalleryFilterModel({
  scripts,
  authors = [],
  orgs = [],
  searchNeedle,
  selectedTags,
  selectedAuthorTags = [],
  selectedOrgTags = [],
  segmentFilter,
  usageFilter,
}: UseGalleryFilterModelInput): UseGalleryFilterModelResult {
  const sourceScripts = scripts || [];
  const [backgroundEnriched, setBackgroundEnriched] = useState<EnrichedGalleryScript[]>([]);

  const syncEnriched = useMemo(
    () =>
      sourceScripts.length <= BACKGROUND_ENRICH_THRESHOLD
        ? sourceScripts.map(enrichScript)
        : [],
    [sourceScripts]
  );

  useEffect(() => {
    if (sourceScripts.length <= BACKGROUND_ENRICH_THRESHOLD) {
      setBackgroundEnriched([]);
      return;
    }
    let cancelled = false;
    const next: EnrichedGalleryScript[] = new Array(sourceScripts.length);
    let index = 0;
    const runBatch = () => {
      if (cancelled) return;
      const end = Math.min(index + ENRICH_BATCH_SIZE, sourceScripts.length);
      for (let i = index; i < end; i++) {
        next[i] = enrichScript(sourceScripts[i]);
      }
      index = end;
      if (index < sourceScripts.length) {
        setTimeout(runBatch, 0);
        return;
      }
      if (!cancelled) setBackgroundEnriched(next);
    };
    setBackgroundEnriched([]);
    runBatch();
    return () => {
      cancelled = true;
    };
  }, [sourceScripts]);

  const scriptsWithMeta =
    sourceScripts.length <= BACKGROUND_ENRICH_THRESHOLD ? syncEnriched : backgroundEnriched;

  const filterOpts: GalleryFilterOptions = useMemo(
    () => ({ searchNeedle, selectedTags, segmentFilter, usageFilter }),
    [searchNeedle, selectedTags, segmentFilter, usageFilter]
  );

  const filteredScripts = useMemo(
    () => filterGalleryScripts(scriptsWithMeta, filterOpts),
    [scriptsWithMeta, filterOpts]
  );

  const topViewedScripts = useMemo(
    () => [...filteredScripts].sort((a, b) => (b.views || 0) - (a.views || 0)),
    [filteredScripts]
  );

  const latestScripts = filteredScripts;

  const featuredSeries = useMemo(
    () => buildFeaturedSeries(scriptsWithMeta),
    [scriptsWithMeta]
  );

  const { allTags, licenseTagShortcuts } = useMemo(
    () => deriveTags(scriptsWithMeta),
    [scriptsWithMeta]
  );

  const filteredAuthors = useMemo(
    () =>
      authors.filter((a) => {
        const matchesSearch = String(a.displayName || "")
          .toLowerCase()
          .includes(searchNeedle);
        const matchesTag =
          selectedAuthorTags.length > 0
            ? (a.tags || []).some((tag) => selectedAuthorTags.includes(tag))
            : true;
        return matchesSearch && matchesTag;
      }),
    [authors, searchNeedle, selectedAuthorTags]
  );

  const filteredOrgs = useMemo(
    () =>
      orgs.filter((o) => {
        const matchesSearch = String(o.name || "")
          .toLowerCase()
          .includes(searchNeedle);
        const matchesTag =
          selectedOrgTags.length > 0
            ? (o.tags || []).some((tag) => selectedOrgTags.includes(tag))
            : true;
        return matchesSearch && matchesTag;
      }),
    [orgs, searchNeedle, selectedOrgTags]
  );

  const authorTags = useMemo(
    () => Array.from(new Set(authors.flatMap((a) => a.tags || []))),
    [authors]
  );

  const orgTags = useMemo(
    () => Array.from(new Set(orgs.flatMap((o) => o.tags || []))),
    [orgs]
  );

  return {
    scriptsWithMeta,
    filteredScripts,
    topViewedScripts,
    latestScripts,
    featuredSeries,
    allTags,
    licenseTagShortcuts,
    filteredAuthors,
    filteredOrgs,
    authorTags,
    orgTags,
  };
}
