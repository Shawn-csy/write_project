import React, { createContext, useContext, useState, useEffect } from "react";
import { useTheme } from "../components/theme-provider";
import {
  accentThemes,
  accentOptions,
  accentClasses,
  defaultAccent,
} from "../constants/accent";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { readNumber, readString, writeValue } from "../lib/storage";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  // --- Theme (Wrapped) ---
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // --- Accent ---
  const [accent, setAccentState] = useState(defaultAccent);
  
  // Update CSS variables when accent changes
  const accentConfig = accentThemes[accent] || accentThemes[defaultAccent];
  useEffect(() => {
    const root = document.documentElement;
    const cfg = accentConfig;
    
    
    if (isDark) {
      root.style.setProperty("--accent", cfg.accentDark || cfg.accent);
      root.style.setProperty("--accent-foreground", cfg.accentForeground); // Usually stays dark text on accent? Or should invert? 
      // Actually standard pattern is Accent is Background, Foreground is Text on top.
      // If Accent is light in Dark Mode, Foreground should be Dark.
      
      root.style.setProperty("--accent-muted", cfg.accentMutedDark || cfg.accentMuted || cfg.accent);
      root.style.setProperty("--accent-strong", cfg.accentStrongDark || cfg.accentStrong || cfg.accent);
    } else {
      root.style.setProperty("--accent", cfg.accent);
      root.style.setProperty("--accent-foreground", cfg.accentForeground);
      root.style.setProperty("--accent-muted", cfg.accentMuted || cfg.accent);
      root.style.setProperty("--accent-strong", cfg.accentStrong || cfg.accent);
    }
  }, [accentConfig, isDark]);

  const setAccent = (val) => {
    setAccentState(val);
    writeValue(STORAGE_KEYS.ACCENT, val);
  };

  // --- Font Sizes ---
  const [fontSize, setFontSizeState] = useState(14); // Scene Heading
  const [bodyFontSize, setBodyFontSizeState] = useState(14); // Action/General
  const [dialogueFontSize, setDialogueFontSizeState] = useState(14); // Dialogue

  const setFontSize = (size) => {
    setFontSizeState(size);
    writeValue(STORAGE_KEYS.FONT_SIZE, size);
  };
  const setBodyFontSize = (size) => {
    setBodyFontSizeState(size);
    writeValue(STORAGE_KEYS.BODY_FONT, size);
  };
  const setDialogueFontSize = (size) => {
    setDialogueFontSizeState(size);
    writeValue(STORAGE_KEYS.DIALOGUE_FONT, size);
  };

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

  // --- Display Modes ---
  const [exportMode, setExportModeState] = useState("processed");
  const [fileLabelMode, setFileLabelModeState] = useState("auto");
  const [focusEffect, setFocusEffectState] = useState("hide");
  const [focusContentMode, setFocusContentModeState] = useState("all");
  const [highlightCharacters, setHighlightCharactersState] = useState(true);
  const [highlightSfx, setHighlightSfxState] = useState(true);

  const setExportMode = (val) => {
    setExportModeState(val);
    writeValue(STORAGE_KEYS.EXPORT_MODE, val);
  };
  const setFileLabelMode = (val) => {
    setFileLabelModeState(val);
    writeValue(STORAGE_KEYS.LABEL_MODE, val);
  };
  const setFocusEffect = (val) => {
    setFocusEffectState(val);
    writeValue(STORAGE_KEYS.FOCUS_EFFECT, val);
  };
  const setFocusContentMode = (val) => {
    setFocusContentModeState(val);
    writeValue(STORAGE_KEYS.FOCUS_CONTENT, val);
  };
  const setHighlightCharacters = (val) => {
    setHighlightCharactersState(val);
    writeValue(STORAGE_KEYS.HIGHLIGHT_CHAR, val ? "on" : "off");
  };
  const setHighlightSfx = (val) => {
    setHighlightSfxState(val);
    writeValue(STORAGE_KEYS.HIGHLIGHT_SFX, val ? "on" : "off");
  };

  // --- Initialization / Hydration ---
  useEffect(() => {
    // Accent
    const savedAccent = readString(STORAGE_KEYS.ACCENT);
    if (savedAccent && accentThemes[savedAccent]) {
      setAccentState(savedAccent);
    }
    // Label Mode
    const savedLabelMode = readString(STORAGE_KEYS.LABEL_MODE, ["auto", "filename"]);
    if (savedLabelMode) setFileLabelModeState(savedLabelMode);

    // Focus Effect
    const savedFocusEffect = readString(STORAGE_KEYS.FOCUS_EFFECT, ["hide", "dim"]);
    if (savedFocusEffect) setFocusEffectState(savedFocusEffect);

    // Focus Content
    const savedFocusContent = readString(STORAGE_KEYS.FOCUS_CONTENT, ["all", "dialogue"]);
    if (savedFocusContent) setFocusContentModeState(savedFocusContent);

    // Highlight
    const savedHighlight = readString(STORAGE_KEYS.HIGHLIGHT_CHAR, ["on", "off"]);
    if (savedHighlight === "off") setHighlightCharactersState(false);

    // SFX
    const savedSfx = readString(STORAGE_KEYS.HIGHLIGHT_SFX, ["on", "off"]);
    if (savedSfx === "off") setHighlightSfxState(false);

    // Fonts
    const savedFontSize = readNumber(STORAGE_KEYS.FONT_SIZE);
    if (savedFontSize) setFontSizeState(savedFontSize);
    
    const savedBodyFont = readNumber(STORAGE_KEYS.BODY_FONT);
    if (savedBodyFont) setBodyFontSizeState(savedBodyFont);
    
    const savedDlgFont = readNumber(STORAGE_KEYS.DIALOGUE_FONT);
    if (savedDlgFont) setDialogueFontSizeState(savedDlgFont);

    // Export
    const savedExportMode = readString(STORAGE_KEYS.EXPORT_MODE, ["processed", "raw"]);
    if (savedExportMode) setExportModeState(savedExportMode);

  }, []);

  const value = {
    // Theme
    isDark,
    setTheme,
    
    // Accent
    accent,
    setAccent,
    accentOptions,
    accentStyle: accentClasses, // Provided for convenience
    accentConfig,
    accentThemes,
    
    // Fonts
    fontSize,
    setFontSize,
    bodyFontSize,
    setBodyFontSize,
    dialogueFontSize,
    setDialogueFontSize,
    adjustFont,

    // Modes
    exportMode,
    setExportMode,
    fileLabelMode,
    setFileLabelMode,
    focusEffect,
    setFocusEffect,
    focusContentMode,
    setFocusContentMode,
    highlightCharacters,
    setHighlightCharacters,
    highlightSfx,
    setHighlightSfx,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
