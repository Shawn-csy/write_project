import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PublicReaderLayout } from "./PublicReaderLayout";

const overlayPropsSpy = vi.fn();

vi.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => ({ hideWhitespace: false }),
}));

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (key, fallback) => fallback || key }),
}));

vi.mock("./SimplifiedReaderHeader", () => ({
  SimplifiedReaderHeader: () => <div data-testid="reader-header">header</div>,
}));

vi.mock("./PublicScriptInfoOverlay", () => ({
  PublicScriptInfoOverlay: (props) => {
    overlayPropsSpy(props);
    return <div data-testid="public-script-info-overlay">overlay</div>;
  },
}));

vi.mock("./PublicMarkerLegend", () => ({
  PublicMarkerLegend: () => <div data-testid="public-marker-legend">legend</div>,
}));

vi.mock("../editor/ScriptSurface", () => ({
  __esModule: true,
  default: ({ headerNode }) => <div data-testid="script-surface">{headerNode}</div>,
}));

vi.mock("../ui/CoverPlaceholder", () => ({
  CoverPlaceholder: () => <div data-testid="cover-placeholder">cover</div>,
}));

vi.mock("../common/SpotlightGuideOverlay", () => ({
  SpotlightGuideOverlay: () => null,
}));

vi.mock("../../lib/scriptExportLoader", () => ({
  loadBasicScriptExport: vi.fn(async () => ({
    exportScriptAsPdf: vi.fn(),
    exportScriptAsDocx: vi.fn(),
    exportScriptAsCsv: vi.fn(),
  })),
  loadXlsxScriptExport: vi.fn(async () => ({
    exportScriptAsXlsx: vi.fn(),
  })),
}));

describe("PublicReaderLayout", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("public-reader-guide-seen-v1", "1");
    overlayPropsSpy.mockClear();
  });

  it("maps legacy activity demo url into demoLinks for info overlay", () => {
    render(
      <PublicReaderLayout
        script={{
          title: "作品",
          content: "#C 角色\n台詞",
          activity: { demoUrl: "https://example.com/legacy-demo", demoLinks: [] },
        }}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("public-script-info-overlay")).toBeInTheDocument();
    const lastCall = overlayPropsSpy.mock.calls[overlayPropsSpy.mock.calls.length - 1]?.[0];
    expect(lastCall.demoLinks).toEqual([
      { id: "demo-legacy", name: "試聽範例", url: "https://example.com/legacy-demo", cast: "", description: "" },
    ]);
  });

  it("passes licenseSpecialTerms to the info overlay", () => {
    render(
      <PublicReaderLayout
        script={{
          title: "作品",
          content: "#C 角色\n台詞",
          licenseSpecialTerms: ["署名", "非商用"],
        }}
        isLoading={false}
      />
    );

    const lastCall = overlayPropsSpy.mock.calls[overlayPropsSpy.mock.calls.length - 1]?.[0];
    expect(lastCall.licenseSpecialTerms).toEqual(["署名", "非商用"]);
  });

  it("passes undefined licenseSpecialTerms gracefully when not provided", () => {
    render(
      <PublicReaderLayout
        script={{ title: "作品", content: "#C 角色\n台詞" }}
        isLoading={false}
      />
    );

    const lastCall = overlayPropsSpy.mock.calls[overlayPropsSpy.mock.calls.length - 1]?.[0];
    expect(lastCall.licenseSpecialTerms).toBeUndefined();
  });

  it("passes pre-computed commercialUse/derivativeUse/notifyOnModify to the info overlay", () => {
    render(
      <PublicReaderLayout
        script={{
          title: "作品",
          content: "#C 角色\n台詞",
          commercialUse: "allow",
          derivativeUse: "disallow",
          notifyOnModify: "required",
        }}
        isLoading={false}
      />
    );

    const lastCall = overlayPropsSpy.mock.calls[overlayPropsSpy.mock.calls.length - 1]?.[0];
    expect(lastCall.commercialUse).toBe("allow");
    expect(lastCall.derivativeUse).toBe("disallow");
    expect(lastCall.notifyOnModify).toBe("required");
  });

  it("enables copy protection listeners when disableCopy is true", () => {
    render(
      <PublicReaderLayout
        script={{
          title: "作品",
          content: "#C 角色\n台詞",
          disableCopy: true,
        }}
        isLoading={false}
      />
    );

    const copyEvent = new Event("copy", { cancelable: true });
    document.dispatchEvent(copyEvent);
    expect(copyEvent.defaultPrevented).toBe(true);
  });
});
