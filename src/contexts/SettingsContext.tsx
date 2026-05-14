import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { useTheme } from "../components/theme-provider";
import {
  accentThemes,
  accentOptions,
  accentClasses,
  defaultAccent,
} from "../constants/accent";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { writeValue } from "../lib/storage";
import { apiCall as serviceApiCall, fetchUserSettings, saveUserSettings, fetchUserThemes } from "../services/settingsApi";
import { DEFAULT_READING_FONT, DEFAULT_UI_FONT, normalizeReadingFont, normalizeUiFont, resolveUiFontStack } from "../constants/readingFonts";

import { useMarkerThemes } from "../hooks/useMarkerThemes";
import { usePersistentState } from "../hooks/usePersistentState";
import { normalizeThemeConfigs } from "../lib/markerThemeCodec";
import type { MarkerTheme } from "../hooks/useMarkerThemes";
import type { MarkerConfig } from "../types/script";

interface StatsKeywordRule {
  factor: number;
  keywords: string;
}

interface StatsConfig {
  wordCountDivisor: number;
  excludeNestedDuration: boolean;
  excludePunctuation: boolean;
  customKeywords: StatsKeywordRule[];
}

type ThemeMode = string;
type AccentName = keyof typeof accentThemes;

interface SettingsContextValue {
  currentUser: ReturnType<typeof useAuth>["currentUser"];
  theme: string | undefined;
  themeMode: ThemeMode;
  exportMode?: string;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
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
  transparentBg: boolean;
  setTransparentBg: (value: boolean) => void;
  showLineUnderline: boolean;
  setShowLineUnderline: (value: boolean) => void;
  hiddenMarkerIds: string[];
  setHiddenMarkerIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleMarkerVisibility: (id: string) => void;
  statsConfig: StatsConfig;
  setStatsConfig: (value: StatsConfig) => void;
  markerThemes: MarkerTheme[];
  setMarkerThemes: (themes: MarkerTheme[]) => void;
  currentThemeId: string;
  setCurrentThemeId: (id: string) => void;
  markerConfigs: MarkerConfig[];
  systemDefaultConfigs: MarkerConfig[];
  setMarkerConfigs: (configs: MarkerConfig[]) => Promise<void>;
  addTheme: (
    name: string,
    initialOrOptions?: MarkerConfig[] | { initialConfigs?: MarkerConfig[]; isPublic?: boolean; description?: string } | null,
    legacyOptions?: { initialConfigs?: MarkerConfig[]; isPublic?: boolean; description?: string } | null
  ) => Promise<MarkerTheme>;
  addThemeFromCurrent: (
    name: string,
    optionsOrPublic?: { initialConfigs?: MarkerConfig[]; isPublic?: boolean; description?: string } | boolean
  ) => Promise<MarkerTheme>;
  deleteTheme: (id: string) => Promise<void>;
  renameTheme: (id: string, name: string) => void;
  updateThemePublicity: (id: string, isPublic: boolean) => Promise<void>;
  updateThemeDescription: (id: string, description: string) => Promise<void>;
  copyPublicTheme: (themeId: string) => Promise<void>;
  switchTheme: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // --- Theme (Wrapped) ---
  const { theme: themeMode, resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const { currentUser, profile } = useAuth();
  const isRemoteUpdate = useRef(false);
  const hydratedUserIdRef = useRef<string | null>(null);

  // --- Persistent State ---
  const [accentRaw, setAccentRaw] = usePersistentState<AccentName>(STORAGE_KEYS.ACCENT, defaultAccent as AccentName);
  const accent: AccentName = accentRaw in accentThemes ? accentRaw : (defaultAccent as AccentName);
  const setAccent = (next: AccentName) => setAccentRaw(next);
  
  // Font Sizes
  const [fontSize, setFontSize] = usePersistentState(STORAGE_KEYS.FONT_SIZE, 14, 'number');
  const [bodyFontSize, setBodyFontSize] = usePersistentState(STORAGE_KEYS.BODY_FONT, 14, 'number');
  const [dialogueFontSize, setDialogueFontSize] = usePersistentState(STORAGE_KEYS.DIALOGUE_FONT, 14, 'number');
  const [readingFontFamilyRaw, setReadingFontFamilyRaw] = usePersistentState(STORAGE_KEYS.READING_FONT, DEFAULT_READING_FONT);
  const readingFontFamily = normalizeReadingFont(readingFontFamilyRaw);
  const setReadingFontFamily = (next: string) => setReadingFontFamilyRaw(normalizeReadingFont(next));
  const [uiFontFamilyRaw, setUiFontFamilyRaw] = usePersistentState(STORAGE_KEYS.UI_FONT, DEFAULT_UI_FONT);
  const uiFontFamily = normalizeUiFont(uiFontFamilyRaw);
  const setUiFontFamily = (next: string) => setUiFontFamilyRaw(normalizeUiFont(next));
  
  // Line Height (1.2 ~ 2.0, default 1.4)
  const [lineHeight, setLineHeight] = usePersistentState(STORAGE_KEYS.LINE_HEIGHT, 1.4, 'number');
  const [desktopUiScaleRaw, setDesktopUiScaleRaw] = usePersistentState(STORAGE_KEYS.DESKTOP_UI_SCALE, 1, 'number');
  const desktopUiScale = Number.isFinite(Number(desktopUiScaleRaw))
    ? Math.min(1.2, Math.max(1, Number(desktopUiScaleRaw)))
    : 1;
  const setDesktopUiScale = (next: number) => {
    const numeric = Number(next);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.min(1.2, Math.max(1, numeric));
    setDesktopUiScaleRaw(Number(clamped.toFixed(2)));
  };

  const [transparentBgStr, setTransparentBgStr] = usePersistentState(STORAGE_KEYS.TRANSPARENT_BG, "off");
  const transparentBg = transparentBgStr === "on";
  const setTransparentBg = (val: boolean) => setTransparentBgStr(val ? "on" : "off");

  const [showLineUnderlineStr, setShowLineUnderlineStr] = usePersistentState(STORAGE_KEYS.SHOW_UNDERLINE, "off");
  const showLineUnderline = showLineUnderlineStr === "on";
  const setShowLineUnderline = (val: boolean) => setShowLineUnderlineStr(val ? "on" : "off");

  const fontSteps = [12, 14, 16, 24, 36, 72];
  const adjustFont = (delta: number) => {
    const idx = fontSteps.findIndex((v) => v === fontSize);
    if (idx === -1) {
      setFontSize(fontSteps[0]);
      return;
    }
    const next = fontSteps[idx + delta];
    if (next) setFontSize(next);
  };

  // Display Modes


  // Booleans mapped to 'on'/'off' via a wrapper or handled in hook?
  // Current hook uses raw values. Existing code used "on"/"off" strings for boolean storage in some cases?
  // Let's check storage.js or original code.
  // Original: writeValue(KEY, val ? "on" : "off")
  // So we need to handle boolean <-> string conversion if we want to maintain EXACT storage compatibility.
  // Or we update usePersistentState to handle transformation?
  // For now, let's keep it simple and do manual wrapper for booleans if needed, OR just store booleans if storage.js supports it.
  // storage.js `readString` returns string. `readNumber` parsed int.
  // If we store boolean as JSON string "true"/"false" it works?
  // Original used "on"/"off". 
  // Let's stick to "on"/"off" for compat or migrating? 
  // I will use a custom setter wrapper for these specific boolean fields to maintain "on"/"off" string storage.
  
  // Actually, usePersistentState reads string. 
  // Let's implement valid state as string "on"/"off" and expose helper boolean getters?
  // Or just migrate to booleans if "on"/"off" is not critical external usage?
  // Let's wrap it to be safe.
  
  const [hideWhitespaceStr, setHideWhitespaceStr] = usePersistentState("hideWhitespace", "off");
  const hideWhitespace = hideWhitespaceStr === "on";
  const setHideWhitespace = (val: boolean) => setHideWhitespaceStr(val ? "on" : "off");



  // Marker visibility (session-level)
  const [hiddenMarkerIds, setHiddenMarkerIds] = useState<string[]>([]);
  const toggleMarkerVisibility = (id: string) => {
    setHiddenMarkerIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  // Stats Configuration
  const defaultStatsConfig: StatsConfig = {
      wordCountDivisor: 200, 
      excludeNestedDuration: false,
      excludePunctuation: false,
      customKeywords: [
          { factor: 1, keywords: "s, sec, 秒" },
          { factor: 60, keywords: "m, min, 分, 分鐘" }
      ]
  };
  const [statsConfig, setStatsConfig] = usePersistentState("statsConfig", defaultStatsConfig);

  // --- Theme Hook ---
  const themes = useMarkerThemes(currentUser, Boolean(profile?.isAdmin));

  // API Helper
  const apiCall = (url: string, method: string, body?: unknown) => serviceApiCall(currentUser, url, method, body);
  
  // Update CSS variables when accent changes
  const accentConfig = accentThemes[accent as AccentName] || accentThemes[defaultAccent];
  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    const cfg = accentConfig;
    
    if (isDark) {
      root.style.setProperty("--accent", cfg.accentDark || cfg.accent);
      root.style.setProperty("--accent-foreground", cfg.accentForeground);
      root.style.setProperty("--accent-muted", cfg.accentMutedDark || cfg.accentMuted || cfg.accent);
      root.style.setProperty("--accent-strong", cfg.accentStrongDark || cfg.accentStrong || cfg.accent);
    } else {
      root.style.setProperty("--accent", cfg.accent);
      root.style.setProperty("--accent-foreground", cfg.accentForeground);
      root.style.setProperty("--accent-muted", cfg.accentMuted || cfg.accent);
      root.style.setProperty("--accent-strong", cfg.accentStrong || cfg.accent);
    }
  }, [accentConfig, isDark]);

  useEffect(() => {
    if (transparentBg) {
      document.documentElement.classList.add("transparent-mode");
    } else {
      document.documentElement.classList.remove("transparent-mode");
    }
  }, [transparentBg]);

  useEffect(() => {
    document.documentElement.style.setProperty("--desktop-ui-scale", String(desktopUiScale));
  }, [desktopUiScale]);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-font-family", resolveUiFontStack(uiFontFamily));
  }, [uiFontFamily]);

  // --- Cloud Sync ---
  // 1. Load from Cloud on Login
  useEffect(() => {
      if (!currentUser) {
          hydratedUserIdRef.current = null;
          return; // Don't run if no user
      }
      const userId = String(currentUser?.uid || "");
      if (!userId) return;
      if (hydratedUserIdRef.current === userId) return;
      hydratedUserIdRef.current = userId;

      async function loadSettings() {
          isRemoteUpdate.current = true;
          try {
              // Fetch settings and themes in parallel to avoid serial round-trips.
              const [data, realThemes] = await Promise.all([
                  fetchUserSettings(currentUser),
                  fetchUserThemes(currentUser),
              ]);
              if (data) {
                  if (data.settings && Object.keys(data.settings).length > 0) {
                      const s = (data.settings || {}) as Record<string, unknown>;

                      // Batch Updates
                      if (typeof s.accent === "string" && s.accent in accentThemes) {
                        setAccent(s.accent as AccentName);
                      }
                      if (typeof s.fontSize === "number") setFontSize(s.fontSize);
                      if (typeof s.editorFontSize === "number") setBodyFontSize(s.editorFontSize);
                      if (typeof s.bodyFontSize === "number") setBodyFontSize(s.bodyFontSize);
                      if (typeof s.dialogueFontSize === "number") setDialogueFontSize(s.dialogueFontSize);
                      if (typeof s.readingFontFamily === "string") setReadingFontFamily(s.readingFontFamily);
                      if (typeof s.uiFontFamily === "string") setUiFontFamily(s.uiFontFamily);
                      if (typeof s.hideWhitespace === "boolean") setHideWhitespace(s.hideWhitespace);
                      if (typeof s.lineHeight === "number") setLineHeight(s.lineHeight);
                      if (typeof s.desktopUiScale === "number") setDesktopUiScale(s.desktopUiScale);
                      if (typeof s.transparentBg === "boolean") setTransparentBg(s.transparentBg);
                      if (typeof s.showLineUnderline === "boolean") setShowLineUnderline(s.showLineUnderline);
                      if (s.statsConfig && typeof s.statsConfig === "object") setStatsConfig(s.statsConfig as StatsConfig);

                      if (realThemes && realThemes.length > 0) {
                          const parsedThemes = realThemes.map((t) => ({
                              ...t,
                              configs: normalizeThemeConfigs(t.configs) as MarkerConfig[],
                          })) as MarkerTheme[];
                          themes.setMarkerThemes(parsedThemes);
                          
                          // Validate currentThemeId
                          const targetId = typeof s.currentThemeId === "string" ? s.currentThemeId : "default";
                          const themeExists = realThemes.find(t => t.id === targetId);
                          if (themeExists) {
                              themes.setCurrentThemeId(targetId);
                          } else {
                              themes.setCurrentThemeId('default');
                          }
                      } else if (Array.isArray(s.markerThemes)) {
                          // Fallback to settings bundle if API returned nothing (rare)
                          themes.setMarkerThemes(s.markerThemes as MarkerTheme[]);
                          if (typeof s.currentThemeId === "string") themes.setCurrentThemeId(s.currentThemeId);
                      }
                  } else {
                      // CLOUD IS EMPTY: Push current local settings to cloud
                      // This ensures initial sync for new users or first-time login
                       const payload = {
                          accent,
                          fontSize,
                          bodyFontSize,
                          dialogueFontSize,
                          readingFontFamily,
                          uiFontFamily,

                          hideWhitespace,

                          lineHeight,
                          desktopUiScale,
                          transparentBg,
                          showLineUnderline: showLineUnderline, // Use boolean for API? Or string? saveUserSettings payload usually mirrors state. 
                          // API payload reconstruction:
                          // wait, saveUserSettings takes payload.
                          // lines 191-206 constructs payload.
                          // I should add showLineUnderline there too.

                          currentThemeId: themes.currentThemeId
                      };
                      await saveUserSettings(currentUser, payload);
                      // Also sync default marker themes if needed? 
                      // Actually addTheme calls API, so we don't need to do anything here for themes if they are empty.
                  }
              }
          } finally {
              // Re-enable local auto-save after remote hydration completes.
              setTimeout(() => {
                  isRemoteUpdate.current = false;
              }, 0);
          }
      }
      loadSettings();
  }, [currentUser]);

  // 2. Auto-Save to Cloud on Change
  useEffect(() => {
      if (!currentUser || isRemoteUpdate.current) return;
      
      const payload = {
          accent,
          fontSize,
          bodyFontSize,
          dialogueFontSize,
          readingFontFamily,
          uiFontFamily,

          hideWhitespace,

          lineHeight,
          desktopUiScale,
          transparentBg,
          showLineUnderline,
          statsConfig,
          currentThemeId: themes.currentThemeId
      };

      const timer = setTimeout(async () => {
          await saveUserSettings(currentUser, payload);
      }, 2000); // 2s debounce

      return () => clearTimeout(timer);
  }, [
      currentUser,
      accent,
      fontSize,
      bodyFontSize,
      dialogueFontSize,
      readingFontFamily,
      uiFontFamily,

      hideWhitespace,

      lineHeight,
      desktopUiScale,
      transparentBg,
      showLineUnderline,
      statsConfig,
      themes.currentThemeId
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo<SettingsContextValue>(() => ({
    // Theme
    currentUser,
    theme: resolvedTheme,
    themeMode,
    isDark,
    setTheme,

    // Accent
    accent,
    setAccent,
    accentOptions,
    accentStyle: accentClasses,
    accentConfig,
    accentThemes,

    // Font Sizes
    fontSize, setFontSize,
    bodyFontSize, setBodyFontSize,
    dialogueFontSize, setDialogueFontSize,
    readingFontFamily, setReadingFontFamily,
    uiFontFamily, setUiFontFamily,
    lineHeight, setLineHeight,
    desktopUiScale, setDesktopUiScale,
    adjustFont,

    // Modes
    hideWhitespace, setHideWhitespace,
    transparentBg, setTransparentBg,
    showLineUnderline, setShowLineUnderline,

    // Marker visibility
    hiddenMarkerIds,
    setHiddenMarkerIds,
    toggleMarkerVisibility,

    // Stats Config
    statsConfig,
    setStatsConfig,

    // Themes (New API)
    ...themes,
  }), [
    currentUser, resolvedTheme, themeMode, isDark, setTheme,
    accent, accentConfig,
    fontSize, bodyFontSize, dialogueFontSize, readingFontFamily, uiFontFamily, lineHeight, desktopUiScale,
    hideWhitespace, transparentBg, showLineUnderline,
    hiddenMarkerIds, statsConfig,
    themes,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
