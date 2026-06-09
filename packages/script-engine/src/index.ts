// marker-theme
export { normalizeMarkerConfigsSchema, normalizeThemeConfigs } from "./marker-theme/normalize";
export { isBlockLike, isInlineLike, normalizeLegacyMarkerType } from "./marker-theme/markerRules";
export { getDefaultMarkerRules, defaultMarkerConfigs, DEFAULT_MARKER_RULES } from "./marker-theme/defaultRules";

// parser
export { parseScreenplay } from "./parser/parseScreenplay";
export { buildAST } from "./parser/directASTBuilder";
export { parseInline, buildFlexiblePattern } from "./parser/inlineParser";
export { splitTitleAndBody, extractTitleEntries } from "./parser/titlePageParser";

// document
export type {
  MarkerConfig,
  AstNode,
  InlineToken,
  TocEntry,
  TitleEntry,
  MarkerUsage,
  ScriptDocument,
} from "./document/astTypes";
export { extractToc } from "./document/toc";

// render model
export { toRenderBlocks } from "./render/toRenderBlocks";
export { toInlineRuns, toLineRuns } from "./render/toInlineRuns";
export type {
  RenderBlock,
  RenderBlockKind,
  InlineRun,
  LineSpan,
  SceneHeadingBlock,
  CharacterBlock,
  TextBlock,
  BlankBlock,
  UnknownBlock,
  LayerBlock,
  RangeBlock,
} from "./render/renderTypes";
