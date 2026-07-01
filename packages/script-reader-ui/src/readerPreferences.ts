export type ReaderTheme = "light" | "dark" | "system";

export const READER_FONT_SIZES = [12, 14, 16, 18, 20, 24] as const;
export type ReaderFontSize = (typeof READER_FONT_SIZES)[number];

export const READER_LINE_HEIGHTS = [1.4, 1.6, 1.8, 2.0] as const;
export type ReaderLineHeight = (typeof READER_LINE_HEIGHTS)[number];

export const READER_FONT_FAMILIES = ["sans", "serif", "mono"] as const;
export type ReaderFontFamily = (typeof READER_FONT_FAMILIES)[number];

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontSize: ReaderFontSize;
  lineHeight: ReaderLineHeight;
  fontFamily: ReaderFontFamily;
}

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  theme: "system",
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: "sans",
};

export const READER_FONT_FAMILY_CSS: Record<ReaderFontFamily, string> = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, ui-serif, serif",
  mono: "ui-monospace, monospace",
};

export function resolveReaderFontFamily(family: ReaderFontFamily): string {
  return READER_FONT_FAMILY_CSS[family] ?? READER_FONT_FAMILY_CSS.sans;
}

export interface ReaderPreferencesState {
  preferences: ReaderPreferences;
  setTheme: (theme: ReaderTheme) => void;
  setFontSize: (size: ReaderFontSize) => void;
  setLineHeight: (height: ReaderLineHeight) => void;
  setFontFamily: (family: ReaderFontFamily) => void;
  reset: () => void;
}
