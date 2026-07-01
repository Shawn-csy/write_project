/**
 * Resolves MarkerConfig[] for a public script.
 * Resolution order (mirrors Vite's public reader):
 *   1. Embedded markerTheme.configs (backend joins on /public-scripts/:id)
 *   2. /api/themes/public list match by markerThemeId
 *   3. Default marker rules
 */

import { apiFetch } from "./api";
import { normalizeMarkerConfigsSchema, getDefaultMarkerRules } from "@write/script-engine";
import type { MarkerConfig } from "@write/script-engine";
import type { PublicScript } from "./types";

type ScriptWithTheme = PublicScript & {
  markerTheme?: { configs?: unknown };
  markerThemeId?: string;
};

export async function resolveMarkerConfigs(script: PublicScript): Promise<MarkerConfig[]> {
  const s = script as ScriptWithTheme;

  // 1. Prefer embedded theme (backend joins markerTheme on /public-scripts/:id)
  if (s.markerTheme?.configs) {
    const normalized = normalizeMarkerConfigsSchema(s.markerTheme.configs);
    if (normalized.length > 0) return normalized;
  }

  // 2. Fetch /api/themes/public list and match by themeId
  const themeId = s.markerThemeId;
  if (themeId && themeId !== "default") {
    try {
      const themes = await apiFetch<Array<{ id?: string; configs?: unknown }>>("/themes/public");
      const matched = themes.find((t) => String(t.id ?? "") === themeId);
      if (matched?.configs) {
        const normalized = normalizeMarkerConfigsSchema(matched.configs);
        if (normalized.length > 0) return normalized;
      }
    } catch {
      // fall through to default
    }
  }

  return getDefaultMarkerRules();
}
