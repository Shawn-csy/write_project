/**
 * AppearanceSettings — Phase 6 QA contract tests.
 *
 * Covers capability-aware gating: showLineUnderline toggle is disabled when
 * the effective presentation renderer mode is timeline or linear (unsupported
 * per the capability matrix). It remains enabled for columns mode and for
 * non-presentation renderer branches.
 *
 * Effective mode = mobile viewport auto-linear takes precedence over config
 * renderMode. useIsMobileViewport (from @write/script-reader-renderer) is mocked
 * here to simulate both desktop and mobile conditions.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceSettings } from "./AppearanceSettings";

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock("../../constants/readingFonts", () => ({
  READING_FONT_OPTIONS: [{ value: "serif", label: "Serif" }],
  UI_FONT_OPTIONS: [{ value: "sans", label: "Sans" }],
  resolveReadingFontStack: () => "serif",
}));

// Stub Slider and Select to avoid jsdom layout issues
vi.mock("../ui/slider", () => ({
  Slider: ({ onValueChange }: { onValueChange?: (v: number[]) => void }) => (
    <input type="range" onChange={(e) => onValueChange?.([Number(e.target.value)])} />
  ),
}));
vi.mock("../ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, "aria-label": label }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; "aria-label"?: string }) => (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onCheckedChange?.(!checked)} />
  ),
}));
vi.mock("../ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock("../ui/separator", () => ({
  Separator: () => <hr />,
}));
vi.mock("../dashboard/publisher/PublisherFormRow", () => ({
  PublisherFormRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("./SettingsSectionCard", () => ({
  SettingsSectionCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockSetShowLineUnderline = vi.fn();
const mockSetUsePresentationRenderer = vi.fn();

function makeSettings(overrides: {
  usePresentationRenderer?: boolean;
  renderMode?: "columns" | "timeline";
  showLineUnderline?: boolean;
} = {}) {
  const {
    usePresentationRenderer = false,
    renderMode = "columns",
    showLineUnderline = false,
  } = overrides;
  return {
    isDark: false,
    setTheme: vi.fn(),
    accent: "emerald",
    accentOptions: [],
    accentThemes: {},
    setAccent: vi.fn(),
    fontSize: 14,
    setFontSize: vi.fn(),
    bodyFontSize: 14,
    setBodyFontSize: vi.fn(),
    dialogueFontSize: 14,
    setDialogueFontSize: vi.fn(),
    lineHeight: 1.4,
    setLineHeight: vi.fn(),
    desktopUiScale: 1,
    setDesktopUiScale: vi.fn(),
    readingFontFamily: "serif",
    setReadingFontFamily: vi.fn(),
    uiFontFamily: "sans",
    setUiFontFamily: vi.fn(),
    showMarkers: true,
    setShowMarkers: vi.fn(),
    showLineUnderline,
    setShowLineUnderline: mockSetShowLineUnderline,
    usePresentationRenderer,
    setUsePresentationRenderer: mockSetUsePresentationRenderer,
    presentationLayoutConfig: {
      version: 1,
      renderMode,
      rowGrouping: "line",
      fallbackTrackId: "main",
      tracks: [],
      routingRules: [],
    },
  };
}

vi.mock("../../contexts/SettingsContext", () => ({
  useSettings: vi.fn(),
}));

vi.mock("@write/script-reader-renderer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@write/script-reader-renderer")>();
  return { ...actual, useIsMobileViewport: vi.fn(() => false) };
});

import { useSettings } from "../../contexts/SettingsContext";
import { useIsMobileViewport } from "@write/script-reader-renderer";
const mockUseSettings = vi.mocked(useSettings);
const mockUseIsMobileViewport = vi.mocked(useIsMobileViewport);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseIsMobileViewport.mockReturnValue(false);
});

describe("AppearanceSettings — Phase 6 capability gating", () => {
  it("line guide toggle is enabled when presentation renderer is off", () => {
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: false }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    expect(btn).not.toHaveAttribute("aria-disabled", "true");
    expect(btn).not.toHaveClass("cursor-not-allowed");
  });

  it("line guide toggle is enabled in columns presentation mode (supported)", () => {
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: true, renderMode: "columns" }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    expect(btn).not.toHaveAttribute("aria-disabled", "true");
  });

  it("line guide toggle is disabled in timeline presentation mode (unsupported)", () => {
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: true, renderMode: "timeline" }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).toHaveClass("cursor-not-allowed");
  });

  it("clicking line guide toggle in unsupported mode does not call setShowLineUnderline", async () => {
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: true, renderMode: "timeline" }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    await userEvent.click(btn);
    expect(mockSetShowLineUnderline).not.toHaveBeenCalled();
  });

  it("clicking line guide toggle in supported mode calls setShowLineUnderline", async () => {
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: false, showLineUnderline: false }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    await userEvent.click(btn);
    expect(mockSetShowLineUnderline).toHaveBeenCalledWith(true);
  });

  it("aria-pressed is false when gated (even if showLineUnderline=true in storage)", () => {
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: true, renderMode: "timeline", showLineUnderline: true }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("line guide toggle is disabled on mobile viewport even when config renderMode is columns (auto-linear)", () => {
    mockUseIsMobileViewport.mockReturnValue(true);
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: true, renderMode: "columns" }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).toHaveClass("cursor-not-allowed");
  });

  it("clicking line guide toggle on mobile viewport does not call setShowLineUnderline", async () => {
    mockUseIsMobileViewport.mockReturnValue(true);
    mockUseSettings.mockReturnValue(makeSettings({ usePresentationRenderer: true, renderMode: "columns" }) as ReturnType<typeof useSettings>);
    render(<AppearanceSettings />);
    const btn = screen.getByRole("button", { name: /appearance\.lineGuide/ });
    await userEvent.click(btn);
    expect(mockSetShowLineUnderline).not.toHaveBeenCalled();
  });
});
