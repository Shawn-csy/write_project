/**
 * Host renderer capability matrix — Vite app extension of the shared package matrix.
 *
 * Imports concrete-mode capabilities from @write/script-reader-renderer and
 * adds host-owned renderer branches (ScriptRenderer, RenderBlockRenderer).
 * ScriptViewer is the host facade that selects between these branches.
 *
 * theme / accentColor / useV2Renderer / v2LayoutConfig are host-selection
 * concerns owned by SettingsContext; they are intentionally absent from all
 * capability descriptors.
 */

import {
  COLUMNS_RENDERER_CAPABILITY,
  TIMELINE_RENDERER_CAPABILITY,
  LINEAR_RENDERER_CAPABILITY,
  SCRIPT_PRESENTATION_RENDERER_CAPABILITY,
  type RendererCapability,
} from "@write/script-reader-renderer";

// ── Host-owned renderer branches ────────────────────────────────────────────

export const SCRIPT_RENDERER_CAPABILITY = {
  typography:        "supported",
  showLineUnderline: "supported",   // show-line-underline CSS class on .script-renderer
  showMarkers:       "supported",
  hiddenMarkerIds:   "supported",
  columnDividers:    "n/a",
  lineNumbers:       "n/a",
  trackHeaders:      "n/a",
} as const satisfies RendererCapability;

export const RENDER_BLOCK_RENDERER_CAPABILITY = {
  typography:        "supported",
  showLineUnderline: "supported",   // show-line-underline CSS class on .render-block-renderer
  showMarkers:       "supported",
  hiddenMarkerIds:   "supported",
  columnDividers:    "n/a",
  lineNumbers:       "n/a",
  trackHeaders:      "n/a",
} as const satisfies RendererCapability;

// ── Full host capability matrix ─────────────────────────────────────────────
// Re-exports shared consts alongside host-owned consts for single-import lookup.

export const HOST_RENDERER_CAPABILITY_MATRIX = {
  // host-owned branches
  ScriptRenderer:          SCRIPT_RENDERER_CAPABILITY,
  RenderBlockRenderer:     RENDER_BLOCK_RENDERER_CAPABILITY,
  // shared package aggregate (mode-dependent — see AggregateCapability)
  ScriptPresentationRenderer: SCRIPT_PRESENTATION_RENDERER_CAPABILITY,
  // shared package concrete modes (for reference)
  ColumnsPresentationRenderer:  COLUMNS_RENDERER_CAPABILITY,
  TimelinePresentationRenderer: TIMELINE_RENDERER_CAPABILITY,
  LinearPresentationRenderer:   LINEAR_RENDERER_CAPABILITY,
} as const;

export type HostRendererName = keyof typeof HOST_RENDERER_CAPABILITY_MATRIX;

// Re-export shared types so host code needs only one import.
export type { CapabilityState, RendererCapability, AggregateCapability } from "@write/script-reader-renderer";
