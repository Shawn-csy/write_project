import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLiveEditorDownloadOptions } from "./useLiveEditorDownloadOptions";

vi.mock("../../lib/scriptExportLoader", () => ({
  loadBasicScriptExport: vi.fn(),
  loadXlsxScriptExport: vi.fn(),
}));
vi.mock("../../lib/api/export", () => ({
  exportScriptToGoogleDocs: vi.fn(),
  exportTableV2ToGoogleDocs: vi.fn(),
}));
vi.mock("../../lib/firebase", () => ({
  getGoogleDocsAccessToken: vi.fn(),
}));
vi.mock("../../lib/googleDrivePicker", () => ({
  pickGoogleDriveFolder: vi.fn(),
}));
vi.mock("../../lib/googleDocsExportModel", () => ({
  buildGoogleDocsBlocksFromScript: vi.fn(() => []),
}));

import { loadBasicScriptExport } from "../../lib/scriptExportLoader";

describe("useLiveEditorDownloadOptions", () => {
  it("uses ensureRenderedHtml when cache is empty", async () => {
    const exportScriptAsDocx = vi.fn(async () => {});
    loadBasicScriptExport.mockResolvedValue({
      exportScriptAsDocx,
      exportScriptAsFountain: vi.fn(),
      exportScriptAsCsv: vi.fn(),
    });

    const ensureRenderedHtml = vi.fn(async () => "<p>rendered</p>");
    const renderedHtmlRef = { current: { processed: "", raw: "" } };

    const { result } = renderHook(() =>
      useLiveEditorDownloadOptions({
        t: (key) => key,
        title: "T",
        content: "C",
        renderedHtmlRef,
        ensureRenderedHtml,
      })
    );

    const docx = result.current.find((item) => item.id === "docx");
    await docx.onClick();

    expect(ensureRenderedHtml).toHaveBeenCalledTimes(1);
    expect(exportScriptAsDocx).toHaveBeenCalledWith("T", {
      text: "C",
      renderedHtml: "<p>rendered</p>",
    });
  });

  it("skips ensureRenderedHtml when processed html already exists", async () => {
    const exportScriptAsDocx = vi.fn(async () => {});
    loadBasicScriptExport.mockResolvedValue({
      exportScriptAsDocx,
      exportScriptAsFountain: vi.fn(),
      exportScriptAsCsv: vi.fn(),
    });

    const ensureRenderedHtml = vi.fn(async () => "");
    const renderedHtmlRef = { current: { processed: "<p>cached</p>", raw: "" } };

    const { result } = renderHook(() =>
      useLiveEditorDownloadOptions({
        t: (key) => key,
        title: "T2",
        content: "C2",
        renderedHtmlRef,
        ensureRenderedHtml,
      })
    );

    const docx = result.current.find((item) => item.id === "docx");
    await docx.onClick();

    expect(ensureRenderedHtml).not.toHaveBeenCalled();
    expect(exportScriptAsDocx).toHaveBeenCalledWith("T2", {
      text: "C2",
      renderedHtml: "<p>cached</p>",
    });
  });

  const mockOrchestratedDoc = { sections: [], layoutConfig: { tracks: [] } } as unknown as import("../../lib/v2/types").OrchestratedDocument;
  const baseRef = { current: { processed: "", raw: "" } };

  it("exposes google-docs-table option when V2 renderer is enabled and orchestratedDoc exists", () => {
    const { result } = renderHook(() =>
      useLiveEditorDownloadOptions({
        t: (key) => key,
        title: "T",
        content: "C",
        renderedHtmlRef: baseRef,
        orchestratedDoc: mockOrchestratedDoc,
        isV2RendererEnabled: true,
      })
    );

    expect(result.current.some((o) => o.id === "google-docs-table")).toBe(true);
  });

  it("hides google-docs-table option when V2 renderer is disabled", () => {
    const { result } = renderHook(() =>
      useLiveEditorDownloadOptions({
        t: (key) => key,
        title: "T",
        content: "C",
        renderedHtmlRef: baseRef,
        orchestratedDoc: mockOrchestratedDoc,
        isV2RendererEnabled: false,
      })
    );

    expect(result.current.some((o) => o.id === "google-docs-table")).toBe(false);
  });

  it("hides google-docs-table option when orchestratedDoc is absent", () => {
    const { result } = renderHook(() =>
      useLiveEditorDownloadOptions({
        t: (key) => key,
        title: "T",
        content: "C",
        renderedHtmlRef: baseRef,
        orchestratedDoc: null,
        isV2RendererEnabled: true,
      })
    );

    expect(result.current.some((o) => o.id === "google-docs-table")).toBe(false);
  });
});
