/**
 * Renderer Capability Matrix — Phase 1 contract.
 *
 * Authoritative source for display-preference support in the shared
 * @write/script-reader-renderer package. Host adapters (Vite, public reader)
 * import these consts and extend them with host-owned renderer branches.
 *
 * ── Preference groups ──────────────────────────────────────────────────────
 *
 *  typography   font family, body/dialogue size, line height
 *  guides       showLineUnderline — horizontal reading-aid lines
 *  markers      showMarkers (tooltip visibility), hiddenMarkerIds
 *  theme        theme/accent — host selection concern, not renderer concern;
 *               intentionally absent from this matrix
 *  presentation columnDividers, lineNumbers, trackHeaders — currently
 *               fixed presentation structure, not user preferences;
 *               no UI toggles until listed here as "supported"
 *
 * ── Layer definitions ──────────────────────────────────────────────────────
 *
 *  concrete mode   ColumnsPresentationRenderer / TimelinePresentationRenderer
 *                  / LinearPresentationRenderer — leaf renderers inside this
 *                  package; own the actual DOM output
 *
 *  aggregate       ScriptPresentationRenderer — selects a concrete mode at
 *                  runtime; capability is mode-dependent, expressed as a
 *                  per-mode map rather than a flat union
 *
 *  host facade     ScriptViewer / ScriptRenderer / RenderBlockRenderer —
 *                  owned by the Vite app; not described here; host imports
 *                  shared consts and composes its own matrix
 *
 * ── CapabilityState values ─────────────────────────────────────────────────
 *
 *  "supported"      preference field is fully wired; user setting takes effect
 *  "unsupported"    renderer does not implement this field; passing it has no
 *                   visible effect; explicit decision, not oversight
 *  "fixed-on"       feature is always active, hardcoded; not yet a user pref
 *  "n/a"            concept does not apply to this renderer's layout model
 */

export type CapabilityState =
  | "supported"
  | "unsupported"
  | "fixed-on"
  | "n/a";

/** Capability descriptor for a single renderer. */
export interface RendererCapability {
  /** font family, body size, dialogue size, line height */
  typography: CapabilityState;
  /** horizontal reading-aid line under each content row */
  showLineUnderline: CapabilityState;
  /** marker tooltip/display visibility */
  showMarkers: CapabilityState;
  /** per-marker-id suppression list */
  hiddenMarkerIds: CapabilityState;
  /** column structure: vertical dividers between tracks */
  columnDividers: CapabilityState;
  /** column structure: source-line number gutter */
  lineNumbers: CapabilityState;
  /** column structure: sticky track-name header row */
  trackHeaders: CapabilityState;
}

// ── Concrete modes ──────────────────────────────────────────────────────────

export const COLUMNS_RENDERER_CAPABILITY = {
  typography:        "supported",
  showLineUnderline: "supported",    // divide-y row underline via showLineUnderline prop
  showMarkers:       "supported",
  hiddenMarkerIds:   "supported",
  columnDividers:    "fixed-on",     // hardcoded border-r; not yet a user preference
  lineNumbers:       "fixed-on",     // hardcoded line gutter; not yet a user preference
  trackHeaders:      "fixed-on",     // hardcoded sticky header row; not yet a user preference
} as const satisfies RendererCapability;

export const TIMELINE_RENDERER_CAPABILITY = {
  typography:        "supported",
  showLineUnderline: "unsupported",  // structural card borders remain layout; explicit decision
  showMarkers:       "supported",
  hiddenMarkerIds:   "supported",
  columnDividers:    "n/a",          // timeline has no column dividers
  lineNumbers:       "n/a",
  trackHeaders:      "n/a",
} as const satisfies RendererCapability;

export const LINEAR_RENDERER_CAPABILITY = {
  typography:        "supported",
  showLineUnderline: "unsupported",  // mobile-first linear layout; add only if UX requires
  showMarkers:       "supported",
  hiddenMarkerIds:   "supported",
  columnDividers:    "n/a",
  lineNumbers:       "n/a",
  trackHeaders:      "n/a",
} as const satisfies RendererCapability;

// ── Aggregate (ScriptPresentationRenderer) ──────────────────────────────────
// ScriptPresentationRenderer selects a concrete mode at runtime (columns /
// timeline / linear). Capability is mode-dependent; a flat boolean would
// misrepresent the conditional support for showLineUnderline.

export type PresentationRendererMode = "columns" | "timeline" | "linear";

export type AggregateCapability = {
  [K in keyof RendererCapability]: Record<PresentationRendererMode, CapabilityState>;
};

export const SCRIPT_PRESENTATION_RENDERER_CAPABILITY = {
  typography:        { columns: "supported",   timeline: "supported",   linear: "supported"   },
  showLineUnderline: { columns: "supported",   timeline: "unsupported", linear: "unsupported" },
  showMarkers:       { columns: "supported",   timeline: "supported",   linear: "supported"   },
  hiddenMarkerIds:   { columns: "supported",   timeline: "supported",   linear: "supported"   },
  columnDividers:    { columns: "fixed-on",    timeline: "n/a",         linear: "n/a"         },
  lineNumbers:       { columns: "fixed-on",    timeline: "n/a",         linear: "n/a"         },
  trackHeaders:      { columns: "fixed-on",    timeline: "n/a",         linear: "n/a"         },
} as const satisfies AggregateCapability;

/** Concrete-mode matrix for programmatic lookup within the shared package. */
export const PRESENTATION_MODE_CAPABILITY_MATRIX = {
  columns:  COLUMNS_RENDERER_CAPABILITY,
  timeline: TIMELINE_RENDERER_CAPABILITY,
  linear:   LINEAR_RENDERER_CAPABILITY,
} as const satisfies Record<PresentationRendererMode, RendererCapability>;

export type RendererName = keyof typeof PRESENTATION_MODE_CAPABILITY_MATRIX;
