/**
 * publicAppearancePreferences — shared appearance preference model for public pages and reader.
 *
 * Storage key: "public-reader:appearance" (JSON object)
 *
 * Rules:
 * - Only "public-reader:appearance" is read or written. No legacy keys.
 * - Do not overwrite stored preferences with defaults during first render.
 * - Invalid stored values are ignored field-by-field; missing fields fall back to DEFAULT_APPEARANCE.
 */

export type AppearanceTheme = "system" | "light" | "dark";
export type ReaderFontFamily = "sans" | "serif" | "mono";
export type SiteTextScale = "compact" | "default" | "comfortable" | "large";

export interface PublicAppearancePreferences {
  theme: AppearanceTheme;
  siteTextScale: SiteTextScale;
  readerFontFamily: ReaderFontFamily;
  readerFontSize: number;
  readerLineHeight: number;
}

export const APPEARANCE_STORAGE_KEY = "public-reader:appearance";

export const VALID_THEMES = new Set<string>(["system", "light", "dark"]);
export const VALID_SITE_TEXT_SCALES = new Set<string>(["compact", "default", "comfortable", "large"]);
export const VALID_FONT_FAMILIES = new Set<string>(["sans", "serif", "mono"]);
export const VALID_FONT_SIZES = new Set<number>([12, 14, 16, 18, 20, 24]);
export const VALID_LINE_HEIGHTS = new Set<number>([1.4, 1.6, 1.8, 2.0]);

// ── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_APPEARANCE: PublicAppearancePreferences = {
  theme: "system",
  siteTextScale: "default",
  readerFontFamily: "sans",
  readerFontSize: 16,
  readerLineHeight: 1.8,
};

// ── Read / write ─────────────────────────────────────────────────────────────

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded or storage blocked
  }
}

/** Parse stored JSON, ignoring invalid fields. */
function parseStored(raw: string | null): Partial<PublicAppearancePreferences> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const p = parsed as Record<string, unknown>;
    const out: Partial<PublicAppearancePreferences> = {};
    if (VALID_THEMES.has(p.theme as string)) out.theme = p.theme as AppearanceTheme;
    if (VALID_SITE_TEXT_SCALES.has(p.siteTextScale as string)) out.siteTextScale = p.siteTextScale as SiteTextScale;
    if (VALID_FONT_FAMILIES.has(p.readerFontFamily as string)) out.readerFontFamily = p.readerFontFamily as ReaderFontFamily;
    if (typeof p.readerFontSize === "number" && p.readerFontSize > 0) out.readerFontSize = p.readerFontSize;
    if (typeof p.readerLineHeight === "number" && p.readerLineHeight > 0) out.readerLineHeight = p.readerLineHeight;
    return out;
  } catch {
    return {};
  }
}

/** Read from storage key. Missing or invalid fields silently return undefined. */
export function readAppearancePreferences(): Partial<PublicAppearancePreferences> {
  return parseStored(safeGetItem(APPEARANCE_STORAGE_KEY));
}

/** Event name dispatched on window after every write so same-page listeners can sync. */
export const APPEARANCE_CHANGE_EVENT = "public-appearance-change";

/** Persist to new key only, then notify same-page listeners. */
export function writeAppearancePreferences(prefs: PublicAppearancePreferences): void {
  safeSetItem(APPEARANCE_STORAGE_KEY, JSON.stringify(prefs));
  try {
    window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGE_EVENT, { detail: prefs }));
  } catch {
    // SSR or restricted environment — ignore
  }
}
