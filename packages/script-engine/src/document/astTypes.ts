/** Canonical AST types for the script engine. */

export interface MarkerConfig {
  id: string;
  type?: string;
  matchMode?: "prefix" | "range" | "block" | "inline" | "virtual" | string;
  isBlock?: boolean;
  start?: string;
  end?: string;
  pause?: string;
  pauseLabel?: string;
  style?: Record<string, string>;
  priority?: number;
  caseInsensitive?: boolean;
  regex?: string;
  label?: string;
  parseAs?: string;
  mapFields?: Record<string, unknown>;
  mapCasts?: Record<string, unknown>;
  rangeGroupId?: string;
  rangeRole?: "start" | "end" | "pause";
  [key: string]: unknown;
}

export interface InlineToken {
  type: "text" | "highlight" | string;
  content: string;
  id?: string;
  style?: Record<string, string>;
}

export interface AstNode {
  type: string;
  text?: string;
  raw?: string;
  lineStart?: number;
  lineEnd?: number;
  children?: AstNode[];
  inline?: InlineToken[];
  id?: string;
  layerType?: string;
  rangeGroupId?: string;
  rangeRole?: "start" | "end" | "pause";
  rangeDepth?: number;
  inRange?: string[];
  rangeDepths?: Record<string, number>;
  rangeStyle?: Record<string, string>;
  style?: Record<string, string>;
  startNode?: AstNode | null;
  endNode?: AstNode | null;
  markerId?: string;
  markerType?: string;
  label?: string;
  inlineLabel?: InlineToken[];
  [key: string]: unknown;
}

export interface TocEntry {
  id: string;
  label: string;
  lineStart: number;
}

export interface TitleEntry {
  key: string;
  indent: number;
  values: string[];
}

export interface MarkerUsage {
  markerId: string;
  count: number;
}

export interface ScriptDocument {
  titlePage: string[];
  titleEntries: TitleEntry[];
  ast: AstNode;
  toc: TocEntry[];
  scenes: { id: string; label: string }[];
  markersUsed: MarkerUsage[];
}
