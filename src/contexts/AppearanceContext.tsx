/**
 * AppearanceContext — low-frequency appearance settings.
 * Changes only when the user explicitly adjusts theme/font/accent.
 * Isolates these stable values so unrelated high-frequency state
 * (e.g. hiddenMarkerIds) does not trigger re-renders here.
 */
import React, { createContext, useContext } from "react";
import type { accentThemes, accentOptions, accentClasses } from "../constants/accent";
import type { LayoutConfig } from "../lib/v2";

type AccentName = keyof typeof accentThemes;

export interface AppearanceContextValue {
  theme: string | undefined;
  themeMode: string;
  isDark: boolean;
  setTheme: (theme: string) => void;
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
  accentOptions: typeof accentOptions;
  accentStyle: typeof accentClasses;
  accentConfig: (typeof accentThemes)[AccentName];
  accentThemes: typeof accentThemes;
  fontSize: number;
  setFontSize: (size: number) => void;
  bodyFontSize: number;
  setBodyFontSize: (size: number) => void;
  dialogueFontSize: number;
  setDialogueFontSize: (size: number) => void;
  readingFontFamily: string;
  setReadingFontFamily: (font: string) => void;
  uiFontFamily: string;
  setUiFontFamily: (font: string) => void;
  lineHeight: number;
  setLineHeight: (height: number) => void;
  desktopUiScale: number;
  setDesktopUiScale: (scale: number) => void;
  adjustFont: (delta: number) => void;
  hideWhitespace: boolean;
  setHideWhitespace: (value: boolean) => void;
  showMarkers: boolean;
  setShowMarkers: (value: boolean) => void;
  transparentBg: boolean;
  setTransparentBg: (value: boolean) => void;
  showLineUnderline: boolean;
  setShowLineUnderline: (value: boolean) => void;
  useV2Renderer: boolean;
  setUseV2Renderer: (value: boolean) => void;
  v2LayoutConfig: LayoutConfig;
  setV2LayoutConfig: (config: LayoutConfig) => void;
  exportMode?: string;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within SettingsProvider");
  return ctx;
}

export const AppearanceProvider = AppearanceContext.Provider;
