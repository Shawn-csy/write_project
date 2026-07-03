/**
 * Server-safe entry point — pure functions and types only, no React hooks.
 * Use this from Next.js Server Components instead of the main barrel.
 */
export { parseBannerSlides } from "./gallery/bannerModel";
export type { HeroSlide } from "./gallery/bannerModel";

export { ScriptGalleryCardFrame } from "./ScriptGalleryCardFrame";
export type { ScriptGalleryCardFrameProps, CardAuthorDisplay, CoverImageRenderer, CoverImageRendererProps } from "./ScriptGalleryCardFrame";

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
