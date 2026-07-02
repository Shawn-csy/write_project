export { RenderBlockRenderer } from "./RenderBlockRenderer";
export type { RenderBlockRendererProps, MarkerConfigLike } from "./RenderBlockRenderer";
export { CHARACTER_COLOR_SEQUENCE } from "./RenderBlockRenderer";
export { getMarkerElement, readMarkerAttrs, MARKER_ID_ATTR, MARKER_LABEL_ATTR } from "./markerDom";
export {
  ScriptPresentationRenderer,
  type PresentationMode,
} from "./presentation/ScriptPresentationRenderer";
export { useIsMobileViewport } from "./presentation/useIsMobileViewport";
export { ColumnsPresentationRenderer } from "./presentation/ColumnsPresentationRenderer";
export { LinearPresentationRenderer } from "./presentation/LinearPresentationRenderer";
export { TimelinePresentationRenderer } from "./presentation/TimelinePresentationRenderer";
export { PresentationEventText, applyDisplayTemplate } from "./presentation/PresentationEventText";
export {
  DEFAULT_READER_DISPLAY_PREFERENCES,
  normalizeReaderDisplayPreferences,
} from "./presentation/readerDisplayPreferences";
export type { ReaderDisplayPreferences, ReaderDisplayPreferencesInput } from "./presentation/readerDisplayPreferences";
export {
  PRESENTATION_MODE_CAPABILITY_MATRIX,
  COLUMNS_RENDERER_CAPABILITY,
  TIMELINE_RENDERER_CAPABILITY,
  LINEAR_RENDERER_CAPABILITY,
  SCRIPT_PRESENTATION_RENDERER_CAPABILITY,
} from "./presentation/rendererCapabilityMatrix";
export type {
  CapabilityState,
  RendererCapability,
  AggregateCapability,
  PresentationRendererMode,
  RendererName,
} from "./presentation/rendererCapabilityMatrix";
export {
  applyMarkerSemanticRoutes,
  buildPresentationTableExport,
  buildPresentationTableExportFromRenderedHtml,
  buildGroupedRows,
  buildPresentationDocumentFromAst,
  cloneDefaultLayoutConfig,
  getMarkerEventKind,
  makeMarkerSemanticRoute,
  normalizeLayoutConfig,
  normalizeEventKind,
  orchestrateDocument,
  ROUTE_PRIORITY,
} from "./presentation";
export type {
  EventKind,
  EventMatchRule,
  LayoutConfig,
  LayoutRenderMode,
  LineSpan,
  MobileTrackBehavior,
  OrchestratedDocument,
  PresentationDocument,
  PresentationGroupedRow,
  PresentationTableCellRun,
  PresentationTableCellStyle,
  PresentationTableExport,
  PresentationTableLayout,
  RangeSpan,
  RoutingRule,
  RowGroupingMode,
  ScriptDocumentVersion,
  ScriptEvent,
  TrackConfig,
  TrackLane,
  TrackRole,
} from "./presentation";
