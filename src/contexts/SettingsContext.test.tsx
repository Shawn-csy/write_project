import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { SettingsProvider, useSettings } from "./SettingsContext";
import { STORAGE_KEYS } from "../constants/storageKeys";

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ currentUser: null, profile: null }),
}));

vi.mock("../components/theme-provider", () => ({
  useTheme: () => ({
    theme: "light",
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}));

vi.mock("../hooks/useMarkerThemes", () => ({
  useMarkerThemes: () => {
    const [currentThemeId, setCurrentThemeId] = React.useState("theme-a");
    const markerThemes = [
      { id: "default", name: "Default", configs: [] },
      { id: "theme-a", name: "Theme A", configs: [] },
      { id: "theme-b", name: "Theme B", configs: [] },
    ];
    return {
      markerThemes,
      setMarkerThemes: vi.fn(),
      currentThemeId,
      setCurrentThemeId,
      markerConfigs: [],
      systemDefaultConfigs: [],
      activeLayoutConfig: { version: 1, renderMode: "columns", rowGrouping: "line", fallbackTrackId: "main", tracks: [], routingRules: [] },
      setMarkerConfigs: vi.fn(),
      addTheme: vi.fn(),
      addThemeFromCurrent: vi.fn(),
      deleteTheme: vi.fn(),
      renameTheme: vi.fn(),
      updateThemePublicity: vi.fn(),
      updateThemeDescription: vi.fn(),
      copyPublicTheme: vi.fn(),
      switchTheme: setCurrentThemeId,
      updateThemeLayoutConfig: vi.fn(),
    };
  },
}));

function Probe() {
  const { useV2Renderer, setUseV2Renderer, currentThemeId, switchTheme } = useSettings();
  return (
    <div>
      <div data-testid="theme">{currentThemeId}</div>
      <div data-testid="v2">{String(useV2Renderer)}</div>
      <button onClick={() => setUseV2Renderer(true)}>on</button>
      <button onClick={() => setUseV2Renderer(false)}>off</button>
      <button onClick={() => switchTheme("theme-a")}>theme-a</button>
      <button onClick={() => switchTheme("theme-b")}>theme-b</button>
    </div>
  );
}

describe("SettingsProvider useV2Renderer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores multi-column enabled state per theme", () => {
    localStorage.setItem(STORAGE_KEYS.USE_V2_RENDERER, "off");

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("theme-a");
    expect(screen.getByTestId("v2").textContent).toBe("false");

    fireEvent.click(screen.getByText("on"));
    expect(screen.getByTestId("v2").textContent).toBe("true");

    fireEvent.click(screen.getByText("theme-b"));
    expect(screen.getByTestId("theme").textContent).toBe("theme-b");
    expect(screen.getByTestId("v2").textContent).toBe("false");

    fireEvent.click(screen.getByText("off"));
    expect(screen.getByTestId("v2").textContent).toBe("false");

    fireEvent.click(screen.getByText("theme-a"));
    expect(screen.getByTestId("theme").textContent).toBe("theme-a");
    expect(screen.getByTestId("v2").textContent).toBe("true");
  });
});
