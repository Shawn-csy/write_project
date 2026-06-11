/**
 * navigationPolicy.ts — pure navigation policy model.
 * No React, no router, no auth. Classifies a script's entry policy from discovery.
 *
 * Consumers:
 * - Gallery card renderer: show age-gate badge or intercept click
 * - Homepage model: annotate filteredScripts with policy
 * - Tests: policy rules must be testable without React
 */

import { SEGMENT_TAGS } from "./filterModel";
import type { EnrichedGalleryScript } from "./filterModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavigationPolicyReason =
  | "none"           // no gate required
  | "age-gate"       // adult content — age verification / terms required
  | "terms-consent"; // general terms consent required (e.g. platform-wide)

export interface ScriptNavigationPolicy {
  scriptId: string;
  reason: NavigationPolicyReason;
  /**
   * When true, discovery UI should show an indicator (badge, overlay, tooltip)
   * to signal the user will encounter a gate before accessing the script.
   */
  showGateIndicator: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADULT_TAGS_LOWER: Set<string> = new Set(
  (SEGMENT_TAGS["adult"] ?? []).map((t) => String(t).toLowerCase())
);

/** Returns true when the script carries at least one adult segment tag. */
export function scriptRequiresAgeGate(script: EnrichedGalleryScript): boolean {
  for (const tag of script._tagSetLower) {
    if (ADULT_TAGS_LOWER.has(tag)) return true;
  }
  return false;
}

// ─── getScriptNavigationPolicy ────────────────────────────────────────────────

/**
 * Pure classification of a single script's navigation policy.
 *
 * @param script     Enriched gallery script.
 * @param termsRequired  When true, platform-wide terms consent is active (backend-driven).
 */
export function getScriptNavigationPolicy(
  script: EnrichedGalleryScript,
  termsRequired: boolean
): ScriptNavigationPolicy {
  const isAdult = scriptRequiresAgeGate(script);

  let reason: NavigationPolicyReason = "none";
  if (isAdult) {
    reason = "age-gate";
  } else if (termsRequired) {
    reason = "terms-consent";
  }

  return {
    scriptId: script.id,
    reason,
    showGateIndicator: isAdult,
  };
}

// ─── annotateScriptsWithPolicy ────────────────────────────────────────────────

/**
 * Annotate a script list with navigation policies.
 * Returns a Map<scriptId, ScriptNavigationPolicy> for O(1) lookup by UI.
 */
export function buildNavigationPolicyMap(
  scripts: EnrichedGalleryScript[],
  termsRequired: boolean
): Map<string, ScriptNavigationPolicy> {
  const map = new Map<string, ScriptNavigationPolicy>();
  for (const script of scripts) {
    map.set(script.id, getScriptNavigationPolicy(script, termsRequired));
  }
  return map;
}
