import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReaderThemeClass } from "../useReaderThemeClass";

function createMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn((_event: "change", listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: "change", listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }),
  } as unknown as MediaQueryList;

  return {
    matchMedia: vi.fn(() => mediaQuery),
    emit(matches: boolean) {
      (mediaQuery as { matches: boolean }).matches = matches;
      const event = { matches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
    mediaQuery,
  };
}

describe("useReaderThemeClass", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
  });

  it("adds dark class for dark theme and removes it on cleanup when absent before mount", () => {
    const { unmount } = renderHook(() => useReaderThemeClass("dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("restores pre-existing dark class on cleanup", () => {
    document.documentElement.classList.add("dark");
    const { unmount } = renderHook(() => useReaderThemeClass("light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    unmount();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies system dark preference immediately", () => {
    const media = createMatchMedia(true);
    renderHook(() => useReaderThemeClass("system", { matchMedia: media.matchMedia }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("tracks system preference changes and removes listener on cleanup", () => {
    const media = createMatchMedia(false);
    const { unmount } = renderHook(() => useReaderThemeClass("system", { matchMedia: media.matchMedia }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => { media.emit(true); });
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    unmount();
    expect(media.mediaQuery.removeEventListener).toHaveBeenCalled();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("restores the previous class state when switching themes", () => {
    const { rerender, unmount } = renderHook(
      ({ theme }) => useReaderThemeClass(theme),
      { initialProps: { theme: "dark" as const } }
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    rerender({ theme: "light" });
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    unmount();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
