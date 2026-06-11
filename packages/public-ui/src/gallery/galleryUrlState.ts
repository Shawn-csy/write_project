/**
 * galleryUrlState.ts — pure URL state model for the public homepage.
 * No React, no router, no i18n. Framework adapters live in host apps.
 */

import { SEGMENT_KEYS } from "./filterModel";
import type { SegmentKey, UsageFilter } from "./filterModel";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Discovery views representable in the URL.
 * Phase 5 will expand this to include "help" | "license" | "about"
 * once public shell navigation is unified.
 */
export type GalleryView = "scripts" | "authors" | "orgs";
export type GalleryViewMode = "standard" | "compact";
/** Reserved for Phase 4 when UI lane selection is wired to the homepage model. */
export type GalleryLaneMode = "featured" | "top" | "latest" | "series";

export interface PublicHomepageUrlState {
  view: GalleryView;
  tags: string[];
  authorTags: string[];
  orgTags: string[];
  usage: UsageFilter;
  segment: SegmentKey;
  mode: GalleryViewMode;
  q: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_URL_STATE: PublicHomepageUrlState = {
  view: "scripts",
  tags: [],
  authorTags: [],
  orgTags: [],
  usage: "all",
  segment: SEGMENT_KEYS.all,
  mode: "standard",
  q: "",
};

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_VIEWS = new Set<GalleryView>(["scripts", "authors", "orgs"]);
const VALID_MODES = new Set<GalleryViewMode>(["standard", "compact"]);
const VALID_USAGES = new Set<UsageFilter>(["all", "commercial"]);
const VALID_SEGMENTS = new Set<SegmentKey>(Object.values(SEGMENT_KEYS));

function safeView(v: string | null): GalleryView {
  return VALID_VIEWS.has(v as GalleryView) ? (v as GalleryView) : DEFAULT_URL_STATE.view;
}

function safeMode(v: string | null): GalleryViewMode {
  return VALID_MODES.has(v as GalleryViewMode) ? (v as GalleryViewMode) : DEFAULT_URL_STATE.mode;
}

function safeUsage(v: string | null): UsageFilter {
  return VALID_USAGES.has(v as UsageFilter) ? (v as UsageFilter) : DEFAULT_URL_STATE.usage;
}

function safeSegment(v: string | null): SegmentKey {
  return VALID_SEGMENTS.has(v as SegmentKey) ? (v as SegmentKey) : DEFAULT_URL_STATE.segment;
}

/** Normalize a repeated query param value into a trimmed, deduplicated, sorted string array. */
function safeStringArray(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v !== "")
    ),
  ].sort();
}

// ─── Parse ────────────────────────────────────────────────────────────────────

/**
 * Parse a URL search param string (or URLSearchParams) into a
 * PublicHomepageUrlState, normalizing unknown values to safe defaults.
 */
export function parseGalleryUrlState(
  input: string | URLSearchParams
): PublicHomepageUrlState {
  const params =
    typeof input === "string" ? new URLSearchParams(input) : input;

  return {
    view: safeView(params.get("view")),
    tags: safeStringArray(params.getAll("tag")),
    authorTags: safeStringArray(params.getAll("authorTag")),
    orgTags: safeStringArray(params.getAll("orgTag")),
    usage: safeUsage(params.get("usage")),
    segment: safeSegment(params.get("segment")),
    mode: safeMode(params.get("mode")),
    q: (params.get("q") ?? "").trim(),
  };
}

// ─── Serialize ────────────────────────────────────────────────────────────────

/**
 * Serialize a PublicHomepageUrlState to URLSearchParams, omitting default values
 * so the default homepage URL stays clean.
 */
export function serializeGalleryUrlState(
  state: PublicHomepageUrlState
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.view !== DEFAULT_URL_STATE.view) {
    params.set("view", state.view);
  }
  // Normalize before writing: trim, dedupe, sort — same rules as parse/merge.
  safeStringArray(state.tags).forEach((tag) => params.append("tag", tag));
  safeStringArray(state.authorTags).forEach((tag) => params.append("authorTag", tag));
  safeStringArray(state.orgTags).forEach((tag) => params.append("orgTag", tag));

  if (state.usage !== DEFAULT_URL_STATE.usage) {
    params.set("usage", state.usage);
  }
  if (state.segment !== DEFAULT_URL_STATE.segment) {
    params.set("segment", state.segment);
  }
  if (state.mode !== DEFAULT_URL_STATE.mode) {
    params.set("mode", state.mode);
  }
  if (state.q !== "") {
    params.set("q", state.q);
  }

  return params;
}

/**
 * Serialize to a query string, including leading `?` only when non-empty.
 */
export function serializeGalleryUrlStateToString(
  state: PublicHomepageUrlState
): string {
  const params = serializeGalleryUrlState(state);
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─── Diff / merge ─────────────────────────────────────────────────────────────

/**
 * Merge a partial update into an existing state, returning a new state object.
 * All merged values are validated and normalized.
 */
export function mergeGalleryUrlState(
  current: PublicHomepageUrlState,
  patch: Partial<PublicHomepageUrlState>
): PublicHomepageUrlState {
  return {
    view: patch.view != null ? safeView(patch.view) : current.view,
    tags: patch.tags != null ? safeStringArray(patch.tags) : current.tags,
    authorTags: patch.authorTags != null ? safeStringArray(patch.authorTags) : current.authorTags,
    orgTags: patch.orgTags != null ? safeStringArray(patch.orgTags) : current.orgTags,
    usage: patch.usage != null ? safeUsage(patch.usage) : current.usage,
    segment: patch.segment != null ? safeSegment(patch.segment) : current.segment,
    mode: patch.mode != null ? safeMode(patch.mode) : current.mode,
    q: patch.q != null ? patch.q.trim() : current.q,
  };
}

/**
 * Returns true when state equals the default (clean homepage URL).
 */
export function isDefaultGalleryUrlState(state: PublicHomepageUrlState): boolean {
  return (
    state.view === DEFAULT_URL_STATE.view &&
    state.tags.length === 0 &&
    state.authorTags.length === 0 &&
    state.orgTags.length === 0 &&
    state.usage === DEFAULT_URL_STATE.usage &&
    state.segment === DEFAULT_URL_STATE.segment &&
    state.mode === DEFAULT_URL_STATE.mode &&
    state.q === ""
  );
}
