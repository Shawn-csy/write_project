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


  const [enableLocalFiles, setEnableLocalFilesState] = useState(true);
  const setEnableLocalFiles = (val) => {
      setEnableLocalFilesState(val);
      writeValue("enableLocalFiles", val ? "on" : "off");
  };

  // --- Markers ---
  const defaultMarkerConfigs = [
      // Block Markers
      { id: 'sound', label: '效果音', start: '{{', end: '}}', isBlock: true, type: 'block', style: { fontWeight: 'bold', color: '#eab308' } },
      { id: 'section', label: '段落', start: '((', end: '))', isBlock: true, type: 'block', style: { fontWeight: 'bold', borderLeft: '4px solid #94a3b8' } },
      { id: 'post', label: '後期', start: '<<', end: '>>', isBlock: true, type: 'block', style: { color: '#94a3b8', fontStyle: 'italic' } },
      
      // Inline Markers (Migrated from hardcoded)
      { 
          id: 'paren', 
          label: '括號與距離', 
          start: '(', 
          end: ')', 
          type: 'inline', 
          matchMode: 'enclosure', 
          keywords: ['V.O.', 'O.S.', 'O.C.', '畫外音', '旁白', '電話', '話筒'], 
          style: { color: '#f97316' }, // Orange for distance
          dimIfNotKeyword: true,       // Opacity 0.6 if not distance
          showDelimiters: true
      },
      { 
          id: 'brace', 
          label: '花括號', 
          start: '{', 
          end: '}', 
          type: 'inline', 
          matchMode: 'enclosure', 
          style: { color: '#f97316' }, // Orange
          showDelimiters: true // Usually shown? Or hidden? Fountain spec says {notes} are strictly ignored? 
          // Implementation before: {Orange} -> text-orange-500. So content is shown.
      },
      { 
          id: 'pipe', 
          label: '紅字備註', 
          start: '|', 
          end: '', 
          type: 'inline', 
          matchMode: 'prefix', 
          style: { color: '#ef4444' } // Red
      },
    // System Markers exposed as Regex
    { 
        id: 'sfx_system', 
        label: '音效 (SFX)', 
        type: 'inline', 
        matchMode: 'regex', 
        regex: '\\[\\s*(?:sfx|SFX)[:：]\\s*(.*?)\\s*\\]', 
        style: { color: 'var(--script-sfx-color, #a855f7)', fontSize: '0.9em' },
        showDelimiters: false,
        priority: 100 // High priority
    },
    {
        id: 'whitespace_system',
        label: '留白指令',
        type: 'inline',
        matchMode: 'regex',
        // Matches (長留白) or （長留白）
        regex: '^[（\\(]\\s*(長留白|中留白|短留白|留白)\\s*[）\\)]$',
        style: { display: 'block', textAlign: 'center', margin: '1em 0', fontStyle: 'italic', color: '#94a3b8' },
        priority: 100
    }
  ];
  const [markerConfigs, setMarkerConfigsState] = useState(defaultMarkerConfigs);

  const setMarkerConfigs = (val) => {
    setMarkerConfigsState(val);
    writeValue('markerConfigs', JSON.stringify(val));
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

    const savedLocalFiles = readString("enableLocalFiles", ["on", "off"]);
    if (savedLocalFiles === "off") setEnableLocalFilesState(false);

    // Markers
    // Markers
    const savedMarkers = readString('markerConfigs');
    if (savedMarkers) {
        try {
            const parsed = JSON.parse(savedMarkers);
            if (Array.isArray(parsed)) {
                // Migration/Merge Logic:
                // Ensure all default markers (by ID) exist in the loaded config.
                // If a user accidentally deleted them, this will restore them.
                // If we want to allow deletion, we should use a version flag.
                // But for this major refactor, forcing the new defaults is safer.
                
                const merged = [...parsed];
                defaultMarkerConfigs.forEach(def => {
                    const exists = merged.find(m => m.id === def.id);
                    if (!exists) {
                        merged.push(def);
                    } else {
                        // Optional: Update properties of existing default markers if schema changed?
                        // For example, if 'type' is missing on old config for 'sound', add it.
                        if (!exists.type && def.type) {
                            exists.type = def.type;
                        }
                         if (!exists.matchMode && def.matchMode) {
                            exists.matchMode = def.matchMode;
                        }
                        
                        // CRITICAL FIX: Force correct type/isBlock for core inline markers
                        // to prevent them from being treated as blocks if local storage is corrupted.
                        if (['paren', 'brace', 'pipe'].includes(def.id)) {
                             exists.type = 'inline';
                             exists.isBlock = false;
                        }
                    }
                });
                
                setMarkerConfigsState(merged);
            }
        } catch (e) {
            console.error("Failed to parse markers", e);
        }
    }

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
    
    // Feature Flags
    enableLocalFiles,
    setEnableLocalFiles,
    
    // Markers
    markerConfigs,
    setMarkerConfigs,
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
