/**
 * Server-safe entry point — pure functions and types only, no React hooks.
 * Use this from Next.js Server Components instead of the main barrel.
 */
export { parseBannerSlides } from "./gallery/bannerModel";
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

export { buildPublicHomepageModel } from "./gallery/homepageModel";
export type {
  PublicHomepageModel,
  BuildPublicHomepageModelInput,
  ScriptLanes,
  FilterChip,
  EmptyStateReason,
} from "./gallery/homepageModel";
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
