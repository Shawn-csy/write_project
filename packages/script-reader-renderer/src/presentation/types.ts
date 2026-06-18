export type ScriptDocumentVersion = 2;

export type EventKind =
  | 'speech'
  | 'sfx'
  | 'bgm'
  | 'stage_direction'
  | 'narration'
  | 'meta'
  | 'custom';

export type TrackRole =
  | 'dialogue'
  | 'sfx'
  | 'narration'
  | 'meta'
  | 'custom';

export type LayoutRenderMode = 'columns' | 'timeline';

export type MobileTrackBehavior = 'inline' | 'badge' | 'collapse';

export type RowGroupingMode = 'line' | 'adjacent_dialogue' | 'marker_dialogue';

export interface LineSpan {
  start: number;
  end: number;
}

export interface ScriptEvent {
  id: string;
  kind: EventKind;
  text: string;
  speakerId?: string;
  markerId?: string;
  lineSpan: LineSpan;
  attrs?: Record<string, unknown>;
}

export interface TrackConfig {
  id: string;
  name: string;
  role: TrackRole;
  order: number;
  enabled: boolean;
  desktopWidth?: number;
  mobileBehavior?: MobileTrackBehavior;
  style?: Record<string, string>;
}

export interface EventMatchRule {
  markerId?: string;
  kind?: EventKind;
  speakerId?: string;
}

export interface RoutingRule {
  id: string;
  priority: number;
  match: EventMatchRule;
  targetTrackId: string;
}

export interface LayoutConfig {
  version: 1;
  renderMode: LayoutRenderMode;
  rowGrouping?: RowGroupingMode;
  fallbackTrackId: string;
  tracks: TrackConfig[];
  routingRules: RoutingRule[];
}

export interface TrackLane {
  trackId: string;
  events: ScriptEvent[];
}

export interface RangeSpan {
  markerId: string;
  startLine: number;
  endLine: number;
}

export interface OrchestratedDocument {
  version: ScriptDocumentVersion;
  layoutConfig: LayoutConfig;
  lanes: TrackLane[];
  unassignedEvents: ScriptEvent[];
  rangeSpans?: RangeSpan[];
}

export interface PresentationDocument {
  version: ScriptDocumentVersion;
  metadata?: Record<string, unknown>;
  layoutConfig: LayoutConfig;
  events: ScriptEvent[];
}
