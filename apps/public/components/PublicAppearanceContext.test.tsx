import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PublicAppearanceProvider, usePublicAppearance } from "./PublicAppearanceContext";
import {
  writeAppearancePreferences,
  DEFAULT_APPEARANCE,
  APPEARANCE_STORAGE_KEY,
} from "@/lib/publicAppearancePreferences";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.publicTextScale;
});

function Probe() {
  const { prefs } = usePublicAppearance();
  return (
    <div
      data-testid="probe"
      data-theme={prefs.theme}
      data-font-size={prefs.readerFontSize}
      data-font-family={prefs.readerFontFamily}
      data-line-height={prefs.readerLineHeight}
    />
  );
}

describe("PublicAppearanceProvider", () => {
  it("initialises with DEFAULT_APPEARANCE before mount effect runs", () => {
    const onThemeChange = vi.fn();
    render(
      <PublicAppearanceProvider onThemeChange={onThemeChange}>
        <Probe />
      </PublicAppearanceProvider>
    );
    // After mount effect the context reflects stored or default prefs.
    // With empty localStorage it resolves to DEFAULT_APPEARANCE.
    expect(screen.getByTestId("probe").dataset.theme).toBe(DEFAULT_APPEARANCE.theme);
  });

  it("loads stored prefs from localStorage on mount", () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_APPEARANCE, theme: "dark", readerFontSize: 20 })
    );
    const onThemeChange = vi.fn();
    render(
      <PublicAppearanceProvider onThemeChange={onThemeChange}>
        <Probe />
      </PublicAppearanceProvider>
    );
    expect(screen.getByTestId("probe").dataset.theme).toBe("dark");
    expect(screen.getByTestId("probe").dataset.fontSize).toBe("20");
    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("syncs prefs when APPEARANCE_CHANGE_EVENT fired by external writer", () => {
    const onThemeChange = vi.fn();
    render(
      <PublicAppearanceProvider onThemeChange={onThemeChange}>
        <Probe />
      </PublicAppearanceProvider>
    );

    act(() => {
      writeAppearancePreferences({ ...DEFAULT_APPEARANCE, theme: "dark", readerFontSize: 18 });
    });

    expect(screen.getByTestId("probe").dataset.theme).toBe("dark");
    expect(screen.getByTestId("probe").dataset.fontSize).toBe("18");
    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("syncs fontFamily and lineHeight from event", () => {
    const onThemeChange = vi.fn();
    render(
      <PublicAppearanceProvider onThemeChange={onThemeChange}>
        <Probe />
      </PublicAppearanceProvider>
    );

    act(() => {
      writeAppearancePreferences({ ...DEFAULT_APPEARANCE, readerFontFamily: "serif", readerLineHeight: 2.0 });
    });

    expect(screen.getByTestId("probe").dataset.fontFamily).toBe("serif");
    expect(screen.getByTestId("probe").dataset.lineHeight).toBe("2");
  });

  it("sets data-public-text-scale on documentElement on mount", () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_APPEARANCE, siteTextScale: "comfortable" })
    );
    render(
      <PublicAppearanceProvider onThemeChange={vi.fn()}>
        <Probe />
      </PublicAppearanceProvider>
    );
    expect(document.documentElement.dataset.publicTextScale).toBe("comfortable");
  });

  it("updates data-public-text-scale when APPEARANCE_CHANGE_EVENT fires", () => {
    render(
      <PublicAppearanceProvider onThemeChange={vi.fn()}>
        <Probe />
      </PublicAppearanceProvider>
    );
    act(() => {
      writeAppearancePreferences({ ...DEFAULT_APPEARANCE, siteTextScale: "large" });
    });
    expect(document.documentElement.dataset.publicTextScale).toBe("large");
  });

  it("setTheme updates prefs and calls onThemeChange", () => {
    const onThemeChange = vi.fn();
    function Setter() {
      const { setTheme } = usePublicAppearance();
      return <button onClick={() => setTheme("light")}>set</button>;
    }
    render(
      <PublicAppearanceProvider onThemeChange={onThemeChange}>
        <Probe />
        <Setter />
      </PublicAppearanceProvider>
    );
    onThemeChange.mockClear();
    act(() => { screen.getByRole("button", { name: "set" }).click(); });
    expect(screen.getByTestId("probe").dataset.theme).toBe("light");
    expect(onThemeChange).toHaveBeenCalledWith("light");
  });
});
