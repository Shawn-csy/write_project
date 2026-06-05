import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { useTheme } from "../components/theme-provider";
import {
  accentThemes,
  accentOptions,
  accentClasses,
  defaultAccent,
} from "../constants/accent";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { apiCall as serviceApiCall, fetchUserSettings, saveUserSettings, fetchUserThemes } from "../services/settingsApi";
import { DEFAULT_READING_FONT, DEFAULT_UI_FONT, normalizeReadingFont, normalizeUiFont, resolveUiFontStack } from "../constants/readingFonts";

import { useMarkerThemes } from "../hooks/useMarkerThemes";
import { usePersistentState } from "../hooks/usePersistentState";
import { normalizeThemeConfigs } from "../lib/markerThemeCodec";
import type { MarkerTheme } from "../hooks/useMarkerThemes";
import type { MarkerConfig } from "../types/script";
import type { LayoutConfig } from "../lib/v2";

import { AppearanceProvider } from "./AppearanceContext";
import { MarkerThemeProvider } from "./MarkerThemeContext";
import { StatsConfigProvider } from "./StatsConfigContext";
import type { CoverPreset, CoverDesign as CoverDesignType } from "../types/coverDesign";
import { MAX_COVER_PRESETS } from "../types/coverDesign";

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
  updateThemeLayoutConfig: (id: string, config: LayoutConfig) => void;
  coverPresets: CoverPreset[];
  saveCoverPreset: (name: string, design: CoverDesignType) => void;
  deleteCoverPreset: (id: string) => void;
}

const FONT_STEPS = [12, 14, 16, 24, 36, 72] as const;

// Synchronously inject accent CSS variables on first paint to prevent accent colour flash.
// Reads localStorage directly (same key as usePersistentState) before React renders.
function injectInitialAccentVars() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACCENT) as keyof typeof accentThemes | null;
    const accentKey = (stored && stored in accentThemes ? stored : defaultAccent) as keyof typeof accentThemes;
    const cfg = accentThemes[accentKey];
    const isDark = document.documentElement.classList.contains("dark");
    const root = document.documentElement;
    root.dataset.accent = accentKey;
    root.style.setProperty("--accent", isDark ? (cfg.accentDark || cfg.accent) : cfg.accent);
    root.style.setProperty("--accent-foreground", cfg.accentForeground);
    root.style.setProperty("--accent-muted", isDark ? (cfg.accentMutedDark || cfg.accentMuted || cfg.accent) : (cfg.accentMuted || cfg.accent));
    root.style.setProperty("--accent-strong", isDark ? (cfg.accentStrongDark || cfg.accentStrong || cfg.accent) : (cfg.accentStrong || cfg.accent));
  } catch {
    // localStorage unavailable — no-op
  }
}
injectInitialAccentVars();

// Synchronously inject UI font and desktop scale CSS variables to prevent layout flash.
function injectInitialLayoutVars() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const root = document.documentElement;
    const uiFont = localStorage.getItem(STORAGE_KEYS.UI_FONT);
    root.style.setProperty("--app-font-family", resolveUiFontStack(uiFont || DEFAULT_UI_FONT));
    const scaleRaw = localStorage.getItem(STORAGE_KEYS.DESKTOP_UI_SCALE);
    const scale = scaleRaw !== null ? Math.min(1.5, Math.max(0.75, Number(scaleRaw))) : 1;
    root.style.setProperty("--desktop-ui-scale", String(Number.isFinite(scale) ? scale : 1));
  } catch {
    // localStorage unavailable — no-op
  }
}
injectInitialLayoutVars();

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
  // setAccentRaw is already stable from usePersistentState; expose directly as setAccent
  const setAccent = setAccentRaw;

  // Font Sizes
  const [fontSize, setFontSize] = usePersistentState(STORAGE_KEYS.FONT_SIZE, 14, 'number');
  const [bodyFontSize, setBodyFontSize] = usePersistentState(STORAGE_KEYS.BODY_FONT, 14, 'number');
  const [dialogueFontSize, setDialogueFontSize] = usePersistentState(STORAGE_KEYS.DIALOGUE_FONT, 14, 'number');
  const [readingFontFamilyRaw, setReadingFontFamilyRaw] = usePersistentState(STORAGE_KEYS.READING_FONT, DEFAULT_READING_FONT);
  const readingFontFamily = normalizeReadingFont(readingFontFamilyRaw);
  const setReadingFontFamily = useCallback(
    (next: string) => setReadingFontFamilyRaw(normalizeReadingFont(next)),
    [setReadingFontFamilyRaw]
  );
  const [uiFontFamilyRaw, setUiFontFamilyRaw] = usePersistentState(STORAGE_KEYS.UI_FONT, DEFAULT_UI_FONT);
  const uiFontFamily = normalizeUiFont(uiFontFamilyRaw);
  const setUiFontFamily = useCallback(
    (next: string) => setUiFontFamilyRaw(normalizeUiFont(next)),
    [setUiFontFamilyRaw]
  );

  // Line Height (1.2 ~ 2.0, default 1.4)
  const [lineHeight, setLineHeight] = usePersistentState(STORAGE_KEYS.LINE_HEIGHT, 1.4, 'number');
  const [desktopUiScaleRaw, setDesktopUiScaleRaw] = usePersistentState(STORAGE_KEYS.DESKTOP_UI_SCALE, 1, 'number');
  const desktopUiScale = Number.isFinite(Number(desktopUiScaleRaw))
    ? Math.min(1.5, Math.max(0.75, Number(desktopUiScaleRaw)))
    : 1;
  const setDesktopUiScale = useCallback((next: number) => {
    const numeric = Number(next);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.min(1.5, Math.max(0.75, numeric));
    setDesktopUiScaleRaw(Number(clamped.toFixed(2)));
  }, [setDesktopUiScaleRaw]);

  const [transparentBgStr, setTransparentBgStr] = usePersistentState(STORAGE_KEYS.TRANSPARENT_BG, "off");
  const transparentBg = transparentBgStr === "on";
  const setTransparentBg = useCallback(
    (val: boolean) => setTransparentBgStr(val ? "on" : "off"),
    [setTransparentBgStr]
  );

  const [showLineUnderlineStr, setShowLineUnderlineStr] = usePersistentState(STORAGE_KEYS.SHOW_UNDERLINE, "off");
  const showLineUnderline = showLineUnderlineStr === "on";
  const setShowLineUnderline = useCallback(
    (val: boolean) => setShowLineUnderlineStr(val ? "on" : "off"),
    [setShowLineUnderlineStr]
  );

  const [useV2RendererStr, setUseV2RendererStr] = usePersistentState(STORAGE_KEYS.USE_V2_RENDERER, "on");
  const [useV2RendererByTheme, setUseV2RendererByTheme] = usePersistentState<Record<string, boolean>>(
    STORAGE_KEYS.USE_V2_RENDERER_BY_THEME,
    {}
  );

  const adjustFont = useCallback((delta: number) => {
    const idx = FONT_STEPS.findIndex((v) => v === fontSize);
    if (idx === -1) {
      setFontSize(FONT_STEPS[0]);
      return;
    }
    const next = FONT_STEPS[idx + delta];
    if (next) setFontSize(next);
  }, [fontSize, setFontSize]);

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
  const setHideWhitespace = useCallback(
    (val: boolean) => setHideWhitespaceStr(val ? "on" : "off"),
    [setHideWhitespaceStr]
  );
  const [showMarkersStr, setShowMarkersStr] = usePersistentState(STORAGE_KEYS.SHOW_MARKERS, "on");
  const showMarkers = showMarkersStr !== "off";
  const setShowMarkers = useCallback(
    (val: boolean) => setShowMarkersStr(val ? "on" : "off"),
    [setShowMarkersStr]
  );



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

  // --- Cover Presets ---
  const [coverPresets, setCoverPresets] = useState<CoverPreset[]>([]);

  const saveCoverPreset = useCallback((name: string, design: CoverDesignType) => {
    setCoverPresets((prev) => {
      if (prev.length >= MAX_COVER_PRESETS) return prev;
      const next: CoverPreset[] = [
        ...prev,
        { id: `preset_${Date.now()}`, name: name.trim() || "未命名樣式", design, createdAt: Date.now() },
      ];
      return next;
    });
  }, []);

  const deleteCoverPreset = useCallback((id: string) => {
    setCoverPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // --- Theme Hook ---
  const themes = useMarkerThemes(currentUser, Boolean(profile?.isAdmin));

  // v2LayoutConfig lives in the active marker theme, not in global settings
  const v2LayoutConfig = themes.activeLayoutConfig;
  const setV2LayoutConfig = useCallback((config: LayoutConfig) => {
    themes.updateThemeLayoutConfig(themes.currentThemeId, config);
  }, [themes.updateThemeLayoutConfig, themes.currentThemeId]);
  const useV2Renderer = useV2RendererByTheme[themes.currentThemeId] ?? (useV2RendererStr === "on");
  const setUseV2Renderer = useCallback(
    (val: boolean) => {
      const next = { ...useV2RendererByTheme, [themes.currentThemeId]: val };
      setUseV2RendererByTheme(next);
    },
    [useV2RendererByTheme, themes.currentThemeId, setUseV2RendererByTheme]
  );

  // API Helper
  const apiCall = useCallback(
    (url: string, method: string, body?: unknown) => serviceApiCall(currentUser, url, method, body),
    [currentUser]
  );
  
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
                      if (typeof s.showMarkers === "boolean") setShowMarkers(s.showMarkers);
                      if (typeof s.lineHeight === "number") setLineHeight(s.lineHeight);
                      if (typeof s.desktopUiScale === "number") setDesktopUiScale(s.desktopUiScale);
                      if (typeof s.transparentBg === "boolean") setTransparentBg(s.transparentBg);
                      if (typeof s.showLineUnderline === "boolean") setShowLineUnderline(s.showLineUnderline);
                      if (s.useV2RendererByTheme && typeof s.useV2RendererByTheme === "object") {
                        setUseV2RendererByTheme(s.useV2RendererByTheme as Record<string, boolean>);
                      }
                      if (typeof s.useV2Renderer === "boolean") setUseV2RendererStr(s.useV2Renderer ? "on" : "off");
                      if (s.statsConfig && typeof s.statsConfig === "object") setStatsConfig(s.statsConfig as StatsConfig);
                      if (Array.isArray(s.coverPresets)) setCoverPresets(s.coverPresets as CoverPreset[]);

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
                          showMarkers,

                          lineHeight,
                          desktopUiScale,
                          transparentBg,
                          showLineUnderline,
                          useV2Renderer,
                          useV2RendererByTheme,
                          currentThemeId: themes.currentThemeId,
                          coverPresets,
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
          showMarkers,

          lineHeight,
          desktopUiScale,
          transparentBg,
          showLineUnderline,
          useV2Renderer,
          useV2RendererByTheme,
          statsConfig,
          currentThemeId: themes.currentThemeId,
          coverPresets,
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
      useV2Renderer,
      useV2RendererByTheme,
      statsConfig,
      themes.currentThemeId,
      coverPresets,
  ]);

  const appearanceValue = useMemo(() => ({
    theme: resolvedTheme,
    themeMode,
    isDark,
    setTheme,
    accent,
    setAccent,
    accentOptions,
    accentStyle: accentClasses,
    accentConfig,
    accentThemes,
    fontSize, setFontSize,
    bodyFontSize, setBodyFontSize,
    dialogueFontSize, setDialogueFontSize,
    readingFontFamily, setReadingFontFamily,
    uiFontFamily, setUiFontFamily,
    lineHeight, setLineHeight,
    desktopUiScale, setDesktopUiScale,
    adjustFont,
    hideWhitespace, setHideWhitespace,
    showMarkers, setShowMarkers,
    transparentBg, setTransparentBg,
    showLineUnderline, setShowLineUnderline,
    useV2Renderer, setUseV2Renderer,
    v2LayoutConfig, setV2LayoutConfig,
  }), [
    resolvedTheme, themeMode, isDark, setTheme,
    accent, setAccent, accentConfig,
    fontSize, setFontSize,
    bodyFontSize, setBodyFontSize,
    dialogueFontSize, setDialogueFontSize,
    readingFontFamily, setReadingFontFamily,
    uiFontFamily, setUiFontFamily,
    lineHeight, setLineHeight,
    desktopUiScale, setDesktopUiScale,
    adjustFont,
    hideWhitespace, setHideWhitespace,
    showMarkers, setShowMarkers,
    transparentBg, setTransparentBg,
    showLineUnderline, setShowLineUnderline,
    useV2Renderer, setUseV2Renderer,
    v2LayoutConfig, setV2LayoutConfig,
  ]);

  const statsConfigValue = useMemo(() => ({
    statsConfig,
    setStatsConfig,
  }), [statsConfig, setStatsConfig]);

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
    showMarkers, setShowMarkers,
    transparentBg, setTransparentBg,
    showLineUnderline, setShowLineUnderline,
    useV2Renderer, setUseV2Renderer,
    v2LayoutConfig, setV2LayoutConfig,

    // Stats Config
    statsConfig,
    setStatsConfig,

    // Cover Presets
    coverPresets,
    saveCoverPreset,
    deleteCoverPreset,

    // Themes (New API)
    ...themes,
  }), [
    currentUser, resolvedTheme, themeMode, isDark, setTheme,
    accent, setAccent, accentConfig,
    fontSize, setFontSize,
    bodyFontSize, setBodyFontSize,
    dialogueFontSize, setDialogueFontSize,
    readingFontFamily, setReadingFontFamily,
    uiFontFamily, setUiFontFamily,
    lineHeight, setLineHeight,
    desktopUiScale, setDesktopUiScale,
    adjustFont,
    hideWhitespace, setHideWhitespace,
    showMarkers, setShowMarkers,
    transparentBg, setTransparentBg,
    showLineUnderline, setShowLineUnderline,
    useV2Renderer, setUseV2Renderer,
    v2LayoutConfig, setV2LayoutConfig,
    statsConfig, setStatsConfig,
    coverPresets, saveCoverPreset, deleteCoverPreset,
    themes,
  ]);

  return (
    <AppearanceProvider value={appearanceValue}>
      <MarkerThemeProvider value={themes}>
        <StatsConfigProvider value={statsConfigValue}>
          <SettingsContext.Provider value={value}>
            {children}
          </SettingsContext.Provider>
        </StatsConfigProvider>
      </MarkerThemeProvider>
    </AppearanceProvider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
