/**
 * publicAppearancePreferences — shared appearance preference model for public pages and reader.
 *
 * Storage key: "public-reader:appearance" (JSON object)
 * Migration sources: "screenplay-reader-theme", "public-reader:reader:preferences"
 *
 * Rules:
 * - Read old keys after mount only.
 * - Write new key only after user-triggered or post-migration resolution.
 * - Do not overwrite stored preferences with defaults during first render.
 * - Invalid stored values are ignored field-by-field.
 */

export type AppearanceTheme = "system" | "light" | "dark";
export type ReaderFontFamily = "sans" | "serif" | "mono";

export interface PublicAppearancePreferences {
  theme: AppearanceTheme;
  readerFontFamily: ReaderFontFamily;
  readerFontSize: number;
  readerLineHeight: number;
}

export const APPEARANCE_STORAGE_KEY = "public-reader:appearance";

export const VALID_THEMES = new Set<string>(["system", "light", "dark"]);
export const VALID_FONT_FAMILIES = new Set<string>(["sans", "serif", "mono"]);
export const VALID_FONT_SIZES = new Set<number>([12, 14, 16, 18, 20, 24]);
export const VALID_LINE_HEIGHTS = new Set<number>([1.4, 1.6, 1.8, 2.0]);

// ── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_APPEARANCE: PublicAppearancePreferences = {
  theme: "system",
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
    if (VALID_FONT_FAMILIES.has(p.readerFontFamily as string)) out.readerFontFamily = p.readerFontFamily as ReaderFontFamily;
    if (typeof p.readerFontSize === "number" && p.readerFontSize > 0) out.readerFontSize = p.readerFontSize;
    if (typeof p.readerLineHeight === "number" && p.readerLineHeight > 0) out.readerLineHeight = p.readerLineHeight;
    return out;
  } catch {
    return {};
  }
}

/** Read from new key. Does NOT consult migration sources — call migrateOnce first. */
export function readAppearancePreferences(): Partial<PublicAppearancePreferences> {
  return parseStored(safeGetItem(APPEARANCE_STORAGE_KEY));
}

/** Persist to new key only. */
export function writeAppearancePreferences(prefs: PublicAppearancePreferences): void {
  safeSetItem(APPEARANCE_STORAGE_KEY, JSON.stringify(prefs));
}

// ── Migration ─────────────────────────────────────────────────────────────────

const OLD_THEME_KEY = "screenplay-reader-theme";
const OLD_READER_PREFS_KEY = "public-reader:reader:preferences";

/**
 * Run once after mount. Reads old keys, merges into new key if new key absent.
 * Returns the resolved preferences after migration.
 * Never overwrites an existing new-key value.
 */
export function migrateAppearancePreferences(): Partial<PublicAppearancePreferences> {
  const existing = safeGetItem(APPEARANCE_STORAGE_KEY);
  if (existing !== null) {
    // New key already written — skip migration, trust it.
    return parseStored(existing);
  }

  const migrated: Partial<PublicAppearancePreferences> = {};

  // 1. Old theme key
  const oldTheme = safeGetItem(OLD_THEME_KEY);
  if (oldTheme && VALID_THEMES.has(oldTheme)) {
    migrated.theme = oldTheme as AppearanceTheme;
  }

  // 2. Old reader preferences (may contain fontFamily/fontSize/lineHeight/theme)
  const oldReaderRaw = safeGetItem(OLD_READER_PREFS_KEY);
  if (oldReaderRaw) {
    try {
      const p = JSON.parse(oldReaderRaw) as Record<string, unknown>;
      // theme in old reader prefs wins over old theme key (more specific)
      if (VALID_THEMES.has(p.theme as string)) migrated.theme = p.theme as AppearanceTheme;
      if (VALID_FONT_FAMILIES.has(p.fontFamily as string)) migrated.readerFontFamily = p.fontFamily as ReaderFontFamily;
      if (typeof p.fontSize === "number" && p.fontSize > 0) migrated.readerFontSize = p.fontSize;
      if (typeof p.lineHeight === "number" && p.lineHeight > 0) migrated.readerLineHeight = p.lineHeight;
    } catch {
      // ignore malformed
    }
  }

  if (Object.keys(migrated).length > 0) {
    // Write merged result to new key
    const full: PublicAppearancePreferences = { ...DEFAULT_APPEARANCE, ...migrated };
    safeSetItem(APPEARANCE_STORAGE_KEY, JSON.stringify(full));
  }

  return migrated;
}
