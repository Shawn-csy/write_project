// Canonical reader state hook
export { useReaderState } from "./useReaderState";
export type { ReaderState, ReaderStateOptions, ReaderStorageAdapter, ReaderTocState } from "./useReaderState";

// Reading preferences
export {
  DEFAULT_READER_PREFERENCES,
  READER_FONT_SIZES,
  READER_LINE_HEIGHTS,
  READER_FONT_FAMILIES,
  READER_FONT_FAMILY_CSS,
  resolveReaderFontFamily,
} from "./readerPreferences";
export type {
  ReaderPreferences,
  ReaderPreferencesState,
  ReaderTheme,
  ReaderFontSize,
  ReaderLineHeight,
  ReaderFontFamily,
} from "./readerPreferences";
export { useReaderThemeClass } from "./useReaderThemeClass";
export type { ReaderThemeClassOptions } from "./useReaderThemeClass";

// Storage adapter
export { createLocalStorageReaderStorage } from "./readerStorage";

// Shared UI components
export { ReaderPreferencesPanel } from "./ReaderPreferencesPanel";
export type { ReaderPreferencesPanelProps } from "./ReaderPreferencesPanel";
export { MarkerVisibilityMenu } from "./MarkerVisibilityMenu";
export type { MarkerVisibilityMenuProps } from "./MarkerVisibilityMenu";
export { TocMenu } from "./TocMenu";
export type { TocMenuProps } from "./TocMenu";
export { ReaderToolbar } from "./ReaderToolbar";
export type { ReaderToolbarProps } from "./ReaderToolbar";

// Primitive state types (used by TocMenu, TocStateEntry passed to callbacks)
export type { TocStateEntry, TocState } from "./useTocState";

// Compatibility — use useReaderState for new code
export { useReaderMarkerVisibility } from "./useReaderMarkerVisibility";
export type { ReaderMarkerVisibility, MarkerConfigLike } from "./useReaderMarkerVisibility";

// useTocState — use useReaderState for new code
export { useTocState } from "./useTocState";
