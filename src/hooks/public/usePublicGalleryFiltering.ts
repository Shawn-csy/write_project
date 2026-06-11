import { useGalleryFilterModel, RESERVED_SEGMENT_TAGS } from "@write/public-ui";
import type {
  GalleryScriptInput,
  EnrichedGalleryScript,
  FeaturedSeries,
  AuthorLike,
  OrgLike,
} from "@write/public-ui";
import type { PersonaLike, TagLike } from "../../types/persona";

// Re-export for callers that previously imported from this file
export { RESERVED_SEGMENT_TAGS };

type SegmentKey = string;
type UsageFilter = "all" | "commercial";

// Intersection keeps Vite's wider TagLike (id: string | number) compatible
type ScriptLike = GalleryScriptInput & {
  persona?: Partial<PersonaLike> | null;
  tags?: Array<string | TagLike>;
  [key: string]: unknown;
};

interface UsePublicGalleryFilteringInput {
  scripts: ScriptLike[];
  authors: AuthorLike[];
  orgs: OrgLike[];
  searchNeedle: string;
  selectedTags: string[];
  selectedAuthorTags: string[];
  selectedOrgTags: string[];
  segmentFilter: SegmentKey | string;
  usageFilter: UsageFilter | string;
  featuredLaneMode: "top" | "latest" | string | boolean;
}

interface UsePublicGalleryFilteringResult {
  scriptsWithMeta: EnrichedGalleryScript[];
  filteredScripts: EnrichedGalleryScript[];
  topViewedScripts: EnrichedGalleryScript[];
  latestScripts: EnrichedGalleryScript[];
  topViewedScriptsPreview: EnrichedGalleryScript[];
  latestScriptsPreview: EnrichedGalleryScript[];
  featuredLaneScripts: EnrichedGalleryScript[];
  featuredSeries: FeaturedSeries[];
  allTags: string[];
  licenseTagShortcuts: string[];
  filteredAuthors: AuthorLike[];
  filteredOrgs: OrgLike[];
  authorTags: string[];
  orgTags: string[];
}

export function usePublicGalleryFiltering({
  scripts,
  authors,
  orgs,
  searchNeedle,
  selectedTags,
  selectedAuthorTags,
  selectedOrgTags,
  segmentFilter,
  usageFilter,
  featuredLaneMode,
}: UsePublicGalleryFilteringInput): UsePublicGalleryFilteringResult {
  return useGalleryFilterModel({
    scripts: scripts as GalleryScriptInput[],
    authors,
    orgs,
    searchNeedle,
    selectedTags,
    selectedAuthorTags,
    selectedOrgTags,
    segmentFilter,
    usageFilter,
    featuredLaneMode,
  });
}
