import { useSettings } from "../contexts/SettingsContext";
import { useScriptView } from "../contexts/ScriptViewContext";

export const useScriptViewerDefaults = (overrides = {}) => {
  const {
    isDark,
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    lineHeight,
    accentConfig,
    markerConfigs,
    hiddenMarkerIds
  } = useSettings();
  const scriptView = useScriptView();

  return {
    theme: overrides.theme ?? (isDark ? "dark" : "light"),
    fontSize: overrides.fontSize ?? fontSize,
    bodyFontSize: overrides.bodyFontSize ?? bodyFontSize,
    dialogueFontSize: overrides.dialogueFontSize ?? dialogueFontSize,
    lineHeight: overrides.lineHeight ?? lineHeight,
    accentColor: overrides.accentColor ?? accentConfig?.accent,
    markerConfigs: overrides.markerConfigs ?? scriptView?.markerConfigs ?? markerConfigs,
    hiddenMarkerIds: overrides.hiddenMarkerIds ?? hiddenMarkerIds ?? []
  };
};
