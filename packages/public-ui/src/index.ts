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
export { resolveCoverText, migrateLegacySub, COVER_VAR_KEYS } from "./cover/types";

// ── Reader shell ──────────────────────────────────────────────────────────
export { PublicReaderShell } from "./reader/PublicReaderShell";
export type { PublicReaderShellProps } from "./reader/PublicReaderShell";

export { ActivitySection } from "./reader/ActivitySection";
export type { ActivitySectionProps } from "./reader/ActivitySection";

export { RelatedSeriesSection } from "./reader/RelatedSeriesSection";
export type { RelatedSeriesSectionProps, RelatedSeriesScriptItem } from "./reader/RelatedSeriesSection";

export { PublicScriptInfoOverlay } from "./reader/PublicScriptInfoOverlay";

export { Badge } from "./badge";
export { AuthorBadge } from "./reader/InlineAuthorBadge";
