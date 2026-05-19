import { useSettings } from "../contexts/SettingsContext";
import { useScriptView } from "../contexts/ScriptViewContext";
import type { MarkerConfig } from "../types/script";
import type { LayoutConfig } from "../lib/v2";

interface ScriptViewerDefaults {
  theme: string;
  fontSize: number;
  bodyFontSize: number;
  dialogueFontSize: number;
  readingFontFamily: string;
  lineHeight: number;
  accentColor: string;
  markerConfigs: MarkerConfig[];
  hiddenMarkerIds: string[];
  showLineUnderline: boolean;
  useV2Renderer: boolean;
  v2LayoutConfig: LayoutConfig;
}

type ScriptViewerDefaultsOverrides = Partial<ScriptViewerDefaults>;

export const useScriptViewerDefaults = (overrides: ScriptViewerDefaultsOverrides = {}): ScriptViewerDefaults => {
  const {
    isDark,
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    readingFontFamily,
    lineHeight,
    accentConfig,
    markerConfigs,
    hiddenMarkerIds,
    showLineUnderline,
    useV2Renderer,
    v2LayoutConfig,
  } = useSettings();
  const scriptView = useScriptView();

  return {
    theme: overrides.theme ?? (isDark ? "dark" : "light"),
    fontSize: overrides.fontSize ?? fontSize,
    bodyFontSize: overrides.bodyFontSize ?? bodyFontSize,
    dialogueFontSize: overrides.dialogueFontSize ?? dialogueFontSize,
    readingFontFamily: overrides.readingFontFamily ?? readingFontFamily,
    lineHeight: overrides.lineHeight ?? lineHeight,
    accentColor: overrides.accentColor ?? accentConfig?.accent,
    markerConfigs: overrides.markerConfigs ?? scriptView?.markerConfigs ?? markerConfigs,
    hiddenMarkerIds: overrides.hiddenMarkerIds ?? hiddenMarkerIds ?? [],
    showLineUnderline: overrides.showLineUnderline ?? showLineUnderline ?? false,
    useV2Renderer: overrides.useV2Renderer ?? useV2Renderer ?? false,
    v2LayoutConfig: overrides.v2LayoutConfig ?? v2LayoutConfig,
  };
};
