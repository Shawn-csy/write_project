import { useSettings } from "../contexts/SettingsContext";
import type { ReaderPreferences } from "../types/readerPreferences";

type ReaderPreferencesOverrides = Partial<ReaderPreferences>;

export const useReaderPreferences = (overrides: ReaderPreferencesOverrides = {}): ReaderPreferences => {
  const {
    isDark,
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    readingFontFamily,
    lineHeight,
    accentConfig,
    showMarkers,
    showLineUnderline,
    useV2Renderer,
    v2LayoutConfig,
  } = useSettings();

  return {
    theme: overrides.theme ?? (isDark ? "dark" : "light"),
    fontSize: overrides.fontSize ?? fontSize,
    bodyFontSize: overrides.bodyFontSize ?? bodyFontSize,
    dialogueFontSize: overrides.dialogueFontSize ?? dialogueFontSize,
    readingFontFamily: overrides.readingFontFamily ?? readingFontFamily,
    lineHeight: overrides.lineHeight ?? lineHeight,
    accentColor: overrides.accentColor ?? accentConfig?.accent,
    showMarkers: overrides.showMarkers ?? showMarkers ?? true,
    showLineUnderline: overrides.showLineUnderline ?? showLineUnderline ?? false,
    useV2Renderer: overrides.useV2Renderer ?? useV2Renderer ?? false,
    v2LayoutConfig: overrides.v2LayoutConfig ?? v2LayoutConfig,
  };
};

