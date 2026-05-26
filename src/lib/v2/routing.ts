/**
 * Routing rule priority constants.
 *
 * Higher number = higher priority. Rules are evaluated in descending order.
 * The orchestrator only considers rules at or above PREFERRED_FLOOR as
 * "hard overrides"; rules below that floor are soft fallbacks.
 *
 * Tier layout:
 *   900+ : marker-level explicit assignments (user-configured v2TrackId)
 *   100–499 : event-kind fallback routes (speech → dialogue track, sfx → sfx track…)
 *   0–99  : catch-all / last-resort rules
 */
export const ROUTE_PRIORITY = {
  /** Floor above which rules are treated as hard overrides in the orchestrator. */
  preferredFloor: 500,

  /** Marker-level explicit track assignment (from v2TrackId on MarkerConfig). */
  markerSemantic: 875,

  /** Event-kind fallback routes — generated automatically from track roles. */
  kindFallback: {
    speech: 100,
    sfx: 100,
    bgm: 100,
    narration: 90,
    stageDirection: 80,
    meta: 50,
  },
} as const;
