"use client";

/**
 * PublicAppearanceContext — shared context for all public appearance preferences.
 * ThemeProvider wraps this; PublicAppearanceMenu and reader consume it.
 *
 * Separating this from ThemeProvider avoids a circular import between
 * ThemeProvider (which applies dark class) and PublicAppearanceMenu (which edits prefs).
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  migrateAppearancePreferences,
  readAppearancePreferences,
  writeAppearancePreferences,
  DEFAULT_APPEARANCE,
} from "@/lib/publicAppearancePreferences";
import type {
  PublicAppearancePreferences,
  AppearanceTheme,
  ReaderFontFamily,
} from "@/lib/publicAppearancePreferences";

interface PublicAppearanceContextValue {
  prefs: PublicAppearancePreferences;
  setTheme: (v: AppearanceTheme) => void;
  setReaderFontFamily: (v: ReaderFontFamily) => void;
  setReaderFontSize: (v: number) => void;
  setReaderLineHeight: (v: number) => void;
}

const Ctx = createContext<PublicAppearanceContextValue>({
  prefs: DEFAULT_APPEARANCE,
  setTheme: () => {},
  setReaderFontFamily: () => {},
  setReaderFontSize: () => {},
  setReaderLineHeight: () => {},
});

export function usePublicAppearance() {
  return useContext(Ctx);
}

interface Props {
  children: React.ReactNode;
  /** Called whenever theme changes so ThemeProvider can apply the dark class. */
  onThemeChange: (theme: AppearanceTheme) => void;
}

export function PublicAppearanceProvider({ children, onThemeChange }: Props) {
  const [prefs, setPrefs] = useState<PublicAppearancePreferences>(DEFAULT_APPEARANCE);

  useEffect(() => {
    migrateAppearancePreferences();
    const stored = readAppearancePreferences();
    const resolved: PublicAppearancePreferences = { ...DEFAULT_APPEARANCE, ...stored };
    setPrefs(resolved);
    onThemeChange(resolved.theme);
  // onThemeChange is stable (defined in ThemeProvider via useCallback)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch: Partial<PublicAppearancePreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writeAppearancePreferences(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((v: AppearanceTheme) => {
    update({ theme: v });
    onThemeChange(v);
  // onThemeChange stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  const setReaderFontFamily = useCallback((v: ReaderFontFamily) => update({ readerFontFamily: v }), [update]);
  const setReaderFontSize = useCallback((v: number) => update({ readerFontSize: v }), [update]);
  const setReaderLineHeight = useCallback((v: number) => update({ readerLineHeight: v }), [update]);

  return (
    <Ctx.Provider value={{ prefs, setTheme, setReaderFontFamily, setReaderFontSize, setReaderLineHeight }}>
      {children}
    </Ctx.Provider>
  );
}
