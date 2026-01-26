import React, { createContext, useContext, useEffect, useRef } from "react";
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
import { apiCall as serviceApiCall, fetchUserSettings, saveUserSettings, fetchUserThemes } from "../services/settingsApi.js";

import { useMarkerThemes } from "../hooks/useMarkerThemes";
import { usePersistentState } from "../hooks/usePersistentState";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  // --- Theme (Wrapped) ---
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const { currentUser } = useAuth();
  const isRemoteUpdate = useRef(false);

  // --- Persistent State ---
  const [accent, setAccent] = usePersistentState(STORAGE_KEYS.ACCENT, defaultAccent);
  
  // Font Sizes
  const [fontSize, setFontSize] = usePersistentState(STORAGE_KEYS.FONT_SIZE, 14, 'number');
  const [bodyFontSize, setBodyFontSize] = usePersistentState(STORAGE_KEYS.BODY_FONT, 14, 'number');
  const [dialogueFontSize, setDialogueFontSize] = usePersistentState(STORAGE_KEYS.DIALOGUE_FONT, 14, 'number');

  const fontSteps = [12, 14, 16, 24, 36, 72];
  const adjustFont = (delta) => {
    const idx = fontSteps.findIndex((v) => v === fontSize);
    if (idx === -1) {
      setFontSize(fontSteps[0]);
      return;
    }
    const next = fontSteps[idx + delta];
    if (next) setFontSize(next);
  };

  // Display Modes
  const [exportMode, setExportMode] = usePersistentState(STORAGE_KEYS.EXPORT_MODE, "processed");
  const [fileLabelMode, setFileLabelMode] = usePersistentState(STORAGE_KEYS.LABEL_MODE, "auto");
  const [focusEffect, setFocusEffect] = usePersistentState(STORAGE_KEYS.FOCUS_EFFECT, "hide");
  const [focusContentMode, setFocusContentMode] = usePersistentState(STORAGE_KEYS.FOCUS_CONTENT, "all");
  
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
  
  const [highlightCharactersStr, setHighlightCharactersStr] = usePersistentState(STORAGE_KEYS.HIGHLIGHT_CHAR, "on");
  const highlightCharacters = highlightCharactersStr === "on";
  const setHighlightCharacters = (val) => setHighlightCharactersStr(val ? "on" : "off");

  const [highlightSfxStr, setHighlightSfxStr] = usePersistentState(STORAGE_KEYS.HIGHLIGHT_SFX, "on");
  const highlightSfx = highlightSfxStr === "on";
  const setHighlightSfx = (val) => setHighlightSfxStr(val ? "on" : "off");

  const [enableLocalFilesStr, setEnableLocalFilesStr] = usePersistentState("enableLocalFiles", "on");
  const enableLocalFiles = enableLocalFilesStr === "on";
  const setEnableLocalFiles = (val) => setEnableLocalFilesStr(val ? "on" : "off");


  // --- Theme Hook ---
  const themes = useMarkerThemes(currentUser);

  // API Helper
  const apiCall = (url, method, body) => serviceApiCall(currentUser, url, method, body);
  
  // Update CSS variables when accent changes
  const accentConfig = accentThemes[accent] || accentThemes[defaultAccent];
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

  // --- Cloud Sync ---
  // 1. Load from Cloud on Login
  useEffect(() => {
      if (!currentUser) return; // Don't run if no user

      async function loadSettings() {
          const data = await fetchUserSettings(currentUser);
          if (data) {
                  if (data.settings && Object.keys(data.settings).length > 0) {
                      console.log("Applying cloud settings...");
                      isRemoteUpdate.current = true;
                      const s = data.settings;
                      
                      // Batch Updates
                      if(s.accent) setAccent(s.accent);
                      if(s.fontSize) setFontSize(s.fontSize);
                      if(s.editorFontSize) setBodyFontSize(s.editorFontSize); 
                      if(s.bodyFontSize) setBodyFontSize(s.bodyFontSize);
                      if(s.dialogueFontSize) setDialogueFontSize(s.dialogueFontSize);
                      if(s.exportMode) setExportMode(s.exportMode);
                      if(s.fileLabelMode) setFileLabelMode(s.fileLabelMode);
                      if(s.focusEffect) setFocusEffect(s.focusEffect);
                      if(s.focusContentMode) setFocusContentMode(s.focusContentMode);
                      if(s.enableLocalFiles !== undefined) setEnableLocalFiles(s.enableLocalFiles);
                      
                      // Always fetch themes from API for logged in users
                      const realThemes = await fetchUserThemes(currentUser);
                      if (realThemes && realThemes.length > 0) {
                          themes.setMarkerThemes(realThemes);
                          
                          // Validate currentThemeId
                          const targetId = s.currentThemeId || 'default';
                          const themeExists = realThemes.find(t => t.id === targetId);
                          if (themeExists) {
                              themes.setCurrentThemeId(targetId);
                          } else {
                              themes.setCurrentThemeId('default');
                          }
                      } else if (s.markerThemes) {
                          // Fallback to settings bundle if API returned nothing (rare)
                          themes.setMarkerThemes(s.markerThemes);
                          if(s.currentThemeId) themes.setCurrentThemeId(s.currentThemeId);
                      }
                  } else {
                      // CLOUD IS EMPTY: Push current local settings to cloud
                      // This ensures initial sync for new users or first-time login
                      console.log("Cloud settings empty, syncing local to cloud...");
                       const payload = {
                          accent,
                          fontSize,
                          bodyFontSize,
                          dialogueFontSize,
                          exportMode,
                          fileLabelMode,
                          focusEffect,
                          focusContentMode,
                          highlightCharacters,
                          highlightSfx,
                          enableLocalFiles,
                          currentThemeId: themes.currentThemeId
                      };
                      await saveUserSettings(currentUser, payload);
                      // Also sync default marker themes if needed? 
                      // Actually addTheme calls API, so we don't need to do anything here for themes if they are empty.
                  }
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
          exportMode,
          fileLabelMode,
          focusEffect,
          focusContentMode,
          highlightCharacters,
          highlightSfx,
          enableLocalFiles,
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
      exportMode,
      fileLabelMode,
      focusEffect,
      focusContentMode,
      highlightCharacters,
      highlightSfx,
      enableLocalFiles,
      themes.markerThemes,
      themes.currentThemeId
  ]);

  const value = {
    // Theme
    currentUser,
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
    adjustFont,

    // Modes
    exportMode, setExportMode,
    fileLabelMode, setFileLabelMode,
    focusEffect, setFocusEffect,
    focusContentMode, setFocusContentMode,
    highlightCharacters, setHighlightCharacters,
    highlightSfx, setHighlightSfx,
    enableLocalFiles, setEnableLocalFiles,

    // Markers (Backwards Compatible + Theme Aware)
    markerConfigs: themes.markerConfigs, 
    setMarkerConfigs: themes.setMarkerConfigs,
    updateMarkerConfigs: themes.setMarkerConfigs,

    // Themes (New API)
    ...themes
  };

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
