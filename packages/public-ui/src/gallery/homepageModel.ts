/**
 * buildPublicHomepageModel — pure function, no React, no router.
 *
 * Derives all display semantics from enriched gallery data + URL state.
 * The host app composes the page; this function owns the "what to show" logic.
 */

import type {
  EnrichedGalleryScript,
  FeaturedSeries,
  AuthorLike,
  OrgLike,
} from "./filterModel";
import type { GalleryView, GalleryViewMode, GalleryLaneMode } from "./galleryUrlState";
import { buildNavigationPolicyMap } from "./navigationPolicy";
import type { ScriptNavigationPolicy } from "./navigationPolicy";
import { groupScriptsIntoGalleryEntries, featuredSeriesToGroup } from "./seriesModel";
import type { PublicGalleryEntry, PublicSeriesGroup } from "./seriesModel";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmptyStateReason =
  | "no-data"           // no scripts/authors/orgs loaded yet
  | "no-match"          // filters applied, zero results
  | "no-public-scripts" // data loaded, but no public scripts exist
  | "none";             // not empty

export type LaneId = "latest" | "top" | "series";

export interface LaneDescriptor {
  id: LaneId;
  title: string;
  /** Series-aware entries, capped at LANE_PREVIEW_SIZE. */
  entries: PublicGalleryEntry[];
  /** True when this lane is the URL-selected active lane. */
  isActive: boolean;
}

export interface ScriptLanes {
  /**
   * Ordered lane list — rendered in order.
   * Order is determined by activeLaneMode (active lane is always first).
   */
  ordered: LaneDescriptor[];
  activeLaneMode: GalleryLaneMode;
}

export interface FilterChip {
  type: "tag" | "segment" | "usage" | "q";
  label: string;
  value: string;
}

export interface PublicHomepageModel {
  // ── View ──────────────────────────────────────────────────────────────────
  view: GalleryView;
  viewMode: GalleryViewMode;

  // ── Scripts ───────────────────────────────────────────────────────────────
  filteredScripts: EnrichedGalleryScript[];
  /**
   * Series-aggregated view of filteredScripts.
   * Same scripts, but same-series scripts are collapsed into PublicSeriesGroup entries.
   * Use this for flat grid rendering (both filtered and default views).
   */
  galleryEntries: PublicGalleryEntry[];
  lanes: ScriptLanes;

  // ── People ────────────────────────────────────────────────────────────────
  filteredAuthors: AuthorLike[];
  filteredOrgs: OrgLike[];

  // ── Filter state ──────────────────────────────────────────────────────────
  hasFilters: boolean;
  /** When true, display the curated lane layout rather than flat filtered grid. */
  showLanes: boolean;
  filterChips: FilterChip[];

  // ── Counts ────────────────────────────────────────────────────────────────
  resultCount: number;

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: EmptyStateReason;

  // ── Tags ──────────────────────────────────────────────────────────────────
  allTags: string[];
  licenseTagShortcuts: string[];

  // ── Navigation policy ─────────────────────────────────────────────────────
  /** Per-script navigation policy. Keyed by script id. O(1) lookup for UI. */
  navigationPolicyMap: Map<string, ScriptNavigationPolicy>;
}

export interface BuildPublicHomepageModelInput {
  view: GalleryView;
  viewMode: GalleryViewMode;
  laneMode: GalleryLaneMode;

  // enriched script data
  filteredScripts: EnrichedGalleryScript[];
  topViewedScripts: EnrichedGalleryScript[];
  latestScripts: EnrichedGalleryScript[];
  featuredSeries: FeaturedSeries[];
  allTags: string[];
  licenseTagShortcuts: string[];

  // people data
  filteredAuthors: AuthorLike[];
  filteredOrgs: OrgLike[];

  // URL filter state (for hasFilters / chips)
  selectedTags: string[];
  selectedAuthorTags: string[];
  selectedOrgTags: string[];
  segment: string;
  usage: string;
  q: string;

  /** Total scripts before filtering (used to distinguish no-data vs no-match). */
  totalScriptCount: number;
  /** Total authors before filtering. */
  totalAuthorCount: number;
  /** Total orgs before filtering. */
  totalOrgCount: number;
  /**
   * Whether platform-wide terms consent is active (from backend terms config).
   * Affects navigation policy for non-adult scripts.
   * Defaults to false — fail open when terms config unavailable.
   */
  termsRequired?: boolean;
}

const LANE_PREVIEW_SIZE = 15;

/** Minimum total public scripts before lane layout activates. */
export const MIN_LANE_SCRIPT_COUNT = 20;
/** Minimum distinct gallery entries (series-collapsed) before lane layout activates. */
export const MIN_DISTINCT_LANE_ENTRY_COUNT = 12;

// ─── buildPublicHomepageModel ─────────────────────────────────────────────────

export function buildPublicHomepageModel(
  input: BuildPublicHomepageModelInput
): PublicHomepageModel {
  const {
    view,
    viewMode,
    laneMode,
    filteredScripts,
    topViewedScripts,
    latestScripts,
    featuredSeries,
    allTags,
    licenseTagShortcuts,
    filteredAuthors,
    filteredOrgs,
    selectedTags,
    selectedAuthorTags,
    selectedOrgTags,
    segment,
    usage,
    q,
    totalScriptCount,
    totalAuthorCount,
    totalOrgCount,
    termsRequired = false,
  } = input;

  // ── hasFilters ────────────────────────────────────────────────────────────
  const hasFilters =
    q !== "" ||
    selectedTags.length > 0 ||
    selectedAuthorTags.length > 0 ||
    selectedOrgTags.length > 0 ||
    segment !== "all" ||
    usage !== "all";

  // ── galleryEntries (series-collapsed flat list) ──────────────────────────
  const galleryEntries = groupScriptsIntoGalleryEntries(filteredScripts);

  // ── showLanes: lane layout only when no filters + enough content ──────────
  const showLanes =
    !hasFilters &&
    view === "scripts" &&
    (totalScriptCount >= MIN_LANE_SCRIPT_COUNT ||
      galleryEntries.length >= MIN_DISTINCT_LANE_ENTRY_COUNT);

  // ── filterChips ───────────────────────────────────────────────────────────
  const filterChips: FilterChip[] = [];
  if (q !== "") {
    filterChips.push({ type: "q", label: `「${q}」`, value: q });
  }
  if (segment !== "all") {
    filterChips.push({ type: "segment", label: segment, value: segment });
  }
  if (usage !== "all") {
    filterChips.push({ type: "usage", label: usage === "commercial" ? "可商用" : usage, value: usage });
  }
  for (const tag of selectedTags) {
    filterChips.push({ type: "tag", label: tag, value: tag });
  }
  for (const tag of selectedAuthorTags) {
    filterChips.push({ type: "tag", label: tag, value: tag });
  }
  for (const tag of selectedOrgTags) {
    filterChips.push({ type: "tag", label: tag, value: tag });
  }

  // ── lanes ─────────────────────────────────────────────────────────────────
  // Group lane scripts into series-aware entries first, then cap at preview size.
  // This ensures same-series chapters collapse into one card in the lane.
  const latestEntries = groupScriptsIntoGalleryEntries(latestScripts).slice(0, LANE_PREVIEW_SIZE);
  const topEntries = groupScriptsIntoGalleryEntries(topViewedScripts).slice(0, LANE_PREVIEW_SIZE);

  // Convert FeaturedSeries → PublicSeriesGroup using canonical seriesModel helpers
  const allFeaturedGroups: PublicSeriesGroup[] = featuredSeries
    .map(featuredSeriesToGroup)
    .filter((series): series is PublicSeriesGroup => series !== null);

  // De-duplicate series: remove any already visible in latest/top lanes
  const visibleSeriesKeys = new Set<string>();
  for (const entry of [...latestEntries, ...topEntries]) {
    if (entry.type === "series") visibleSeriesKeys.add(entry.key);
  }
  const seriesEntries: PublicGalleryEntry[] = allFeaturedGroups
    .filter((s) => !visibleSeriesKeys.has(s.key));

  // Build all three canonical lanes.
  // isActive = user *explicitly* selected this lane via URL (non-default).
  // "latest" is the default lane — no URL param set — so it is never "active" in the emphasis sense.
  // "featured" is a meta-mode (editorial ordering); no single lane is "active".
  const latestLane: LaneDescriptor = { id: "latest", title: "最新發布", entries: latestEntries, isActive: false };
  const topLane: LaneDescriptor    = { id: "top",    title: "點閱排行", entries: topEntries,    isActive: laneMode === "top" };
  const seriesLane: LaneDescriptor = { id: "series", title: "系列作品", entries: seriesEntries, isActive: laneMode === "series" };

  // Active lane is always first; "featured" promotes editorial order (top+series before latest)
  const ordered =
    laneMode === "top"      ? [topLane, latestLane, seriesLane] :
    laneMode === "series"   ? [seriesLane, latestLane, topLane] :
    laneMode === "featured" ? [topLane, seriesLane, latestLane] :
                              [latestLane, topLane, seriesLane];

  const lanes: ScriptLanes = { ordered, activeLaneMode: laneMode };

  // ── resultCount ───────────────────────────────────────────────────────────
  const resultCount =
    view === "scripts"
      ? filteredScripts.length
      : view === "authors"
      ? filteredAuthors.length
      : filteredOrgs.length;

  // ── emptyState ────────────────────────────────────────────────────────────
  let emptyState: EmptyStateReason = "none";
  if (view === "scripts") {
    if (filteredScripts.length === 0) {
      if (totalScriptCount === 0) {
        emptyState = "no-public-scripts";
      } else if (hasFilters) {
        emptyState = "no-match";
      } else {
        emptyState = "no-data";
      }
    }
  } else if (view === "authors") {
    if (filteredAuthors.length === 0) {
      emptyState = totalAuthorCount === 0 ? "no-data" : "no-match";
    }
  } else if (view === "orgs") {
    if (filteredOrgs.length === 0) {
      emptyState = totalOrgCount === 0 ? "no-data" : "no-match";
    }
  }

  // ── Navigation policy map ─────────────────────────────────────────────────
  // Built from all enriched scripts (not just filtered) so lane cards also get policy.
  const seriesScripts = featuredSeries.flatMap((series) => series.scripts);
  const allEnrichedScripts = [...filteredScripts, ...latestScripts, ...topViewedScripts, ...seriesScripts];
  const dedupedForPolicy = Array.from(
    new Map(allEnrichedScripts.map((s) => [s.id, s])).values()
  );
  const navigationPolicyMap = buildNavigationPolicyMap(dedupedForPolicy, termsRequired);

  return {
    view,
    viewMode,
    filteredScripts,
    galleryEntries,
    lanes,
    filteredAuthors,
    filteredOrgs,
    hasFilters,
    showLanes,
    filterChips,
    resultCount,
    emptyState,
    allTags,
    licenseTagShortcuts,
    navigationPolicyMap,
  };
}
