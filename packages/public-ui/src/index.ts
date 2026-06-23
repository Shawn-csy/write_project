export { HorizontalScrollLane } from "./HorizontalScrollLane";
export type { HorizontalScrollLaneProps } from "./HorizontalScrollLane";

export { ScriptGalleryCard } from "./ScriptGalleryCard";
export type { ScriptGalleryCardProps, ScriptGalleryItem, AuthorInfo, TagLike, PublicLinkConfig } from "./ScriptGalleryCard";

export { CoverPlaceholder } from "./cover/CoverPlaceholder";
export { CoverRenderer, COVER_W, COVER_H, COVER_COMPACT_W, COVER_COMPACT_H } from "./cover/CoverRenderer";
export type { CoverRendererProps } from "./cover/CoverRenderer";
export type {
  CoverDesign,
  CoverTextLayer,
  CoverVars,
  CoverFont,
  CoverBgType,
  CoverTextEffect,
  CoverFrameType,
  CoverAccentShape,
  CoverVarKey,
} from "./cover/types";
export { resolveCoverText, COVER_VAR_KEYS } from "./cover/types";

// ── Reader shell ──────────────────────────────────────────────────────────
export { PublicReaderShell } from "./reader/PublicReaderShell";
export type { PublicReaderShellProps, ContentWidth } from "./reader/PublicReaderShell";

export { ActivitySection } from "./reader/ActivitySection";
export type { ActivitySectionProps } from "./reader/ActivitySection";

export { RelatedSeriesSection } from "./reader/RelatedSeriesSection";
export type { RelatedSeriesSectionProps, RelatedSeriesScriptItem } from "./reader/RelatedSeriesSection";

export { PublicScriptInfoOverlay } from "./reader/PublicScriptInfoOverlay";

export { Badge } from "./badge";
export { AuthorBadge } from "./reader/InlineAuthorBadge";

// ── Gallery ───────────────────────────────────────────────────────────────
export { PublicHeroMarquee } from "./gallery/PublicHeroMarquee";
export { PublicGalleryTopBar, DEFAULT_TABS } from "./gallery/PublicGalleryTopBar";
export type { PublicGalleryTopBarProps, PublicGalleryTab } from "./gallery/PublicGalleryTopBar";
export type { PublicHeroMarqueeProps } from "./gallery/PublicHeroMarquee";
export { parseBannerSlides, DEV_PLACEHOLDER_SLIDES } from "./gallery/bannerModel";
export type { HeroSlide } from "./gallery/bannerModel";
export {
  SEGMENT_KEYS,
  SEGMENT_TAGS,
  RESERVED_SEGMENT_TAGS,
  enrichScript,
  filterGalleryScripts,
  buildFeaturedSeries,
  deriveTags,
  deriveSimpleLicenseTags,
  normalizeSeriesName,
  parseSeriesOrder,
} from "./gallery/filterModel";
export type {
  SegmentKey,
  UsageFilter,
  GalleryScriptInput,
  EnrichedGalleryScript,
  FeaturedSeries,
  GalleryFilterOptions,
  DerivedTagSets,
  AuthorLike,
  OrgLike,
  PersonaLike,
} from "./gallery/filterModel";
export { useGalleryFilterModel } from "./gallery/useGalleryFilterModel";
export type {
  UseGalleryFilterModelInput,
  UseGalleryFilterModelResult,
} from "./gallery/useGalleryFilterModel";
export { buildPublicHomepageModel } from "./gallery/homepageModel";
export {
  scriptRequiresAgeGate,
  getScriptNavigationPolicy,
  buildNavigationPolicyMap,
} from "./gallery/navigationPolicy";
export type {
  NavigationPolicyReason,
  ScriptNavigationPolicy,
} from "./gallery/navigationPolicy";
export type {
  PublicHomepageModel,
  BuildPublicHomepageModelInput,
  ScriptLanes,
  FilterChip,
  EmptyStateReason,
} from "./gallery/homepageModel";
export {
  groupScriptsIntoGalleryEntries,
  deriveSeriesChapterOrder,
  deriveAggregateAgeGate,
  getSeriesTimestamp,
  findSeriesGroupByName,
  toChapterNavModel,
} from "./gallery/seriesModel";
export type {
  PublicSeriesGroup,
  PublicGalleryEntry,
  ChapterNavItem,
  ChapterNavModel,
} from "./gallery/seriesModel";

export { GalleryHoverPreviewProvider, useGalleryHoverPreview, clampPreviewPosition } from "./gallery/GalleryHoverPreview";
export type { PreviewData } from "./gallery/GalleryHoverPreview";

export { SeriesGalleryCard } from "./gallery/SeriesGalleryCard";
export type { SeriesGalleryCardProps } from "./gallery/SeriesGalleryCard";

export { deriveNewChapterHint, buildProgressUpdate } from "./gallery/seriesProgress";
export type {
  LocalSeriesProgress,
  NewChapterHintInput,
  BuildProgressUpdateInput,
} from "./gallery/seriesProgress";

export {
  parseGalleryUrlState,
  serializeGalleryUrlState,
  serializeGalleryUrlStateToString,
  mergeGalleryUrlState,
  isDefaultGalleryUrlState,
  DEFAULT_URL_STATE,
} from "./gallery/galleryUrlState";
export type {
  GalleryView,
  GalleryViewMode,
  GalleryLaneMode,
  PublicHomepageUrlState,
} from "./gallery/galleryUrlState";
