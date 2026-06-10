import { useEffect } from "react";
import type { ReaderTheme } from "./readerPreferences";

export interface ReaderThemeClassOptions {
  className?: string;
  getTarget?: () => Element | null;
  matchMedia?: (query: string) => MediaQueryList;
}

const defaultGetTarget = () => document.documentElement;
const defaultMatchMedia = (query: string) => window.matchMedia(query);

function setClass(target: Element, className: string, enabled: boolean): void {
  if (enabled) {
    target.classList.add(className);
  } else {
    target.classList.remove(className);
  }
}

/**
 * Applies the reader theme class while the reader is mounted.
 *
 * The hook restores the target's previous class state on cleanup, so reader-only
 * preferences do not leak to the rest of the host app.
 */
export function useReaderThemeClass(
  theme: ReaderTheme,
  {
    className = "dark",
    getTarget = defaultGetTarget,
    matchMedia = defaultMatchMedia,
  }: ReaderThemeClassOptions = {}
): void {
  useEffect(() => {
    const target = getTarget();
    if (!target) return undefined;

    const hadClass = target.classList.contains(className);
    const restore = () => setClass(target, className, hadClass);

    if (theme === "dark") {
      setClass(target, className, true);
      return restore;
    }

    if (theme === "light") {
      setClass(target, className, false);
      return restore;
    }

    const mediaQuery = matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = (matches: boolean) => {
      setClass(target, className, matches);
    };
    const handleChange = (event: MediaQueryListEvent) => {
      applySystemTheme(event.matches);
    };

    applySystemTheme(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      restore();
    };
  }, [className, getTarget, matchMedia, theme]);
}
