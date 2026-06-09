/**
 * screenplayAST — thin facade over @write/script-engine.
 * Public API is identical to the previous implementation.
 * All parser logic lives in packages/script-engine.
 */

import { parseScreenplay as _parseScreenplay } from "@write/script-engine";

export const parseScreenplay = (text = "", markerConfigs?: unknown) => {
  const doc = _parseScreenplay(text, markerConfigs);
  // Return shape matches the old API so all existing call sites work unchanged.
  return {
    titleLines: doc.titlePage,
    titleEntries: doc.titleEntries,
    ast: doc.ast,
    scenes: doc.scenes,
  };
};

// Deprecated — kept for backward compat
export const buildScriptAST = (_tokens: unknown, _markerConfigs: unknown[] = []) => {
  console.warn("buildScriptAST is deprecated. Use parseScreenplay instead.");
  return { type: "root", children: [] };
};
