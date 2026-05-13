import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLiveEditorDownloadOptions } from "./useLiveEditorDownloadOptions";

vi.mock("../../lib/scriptExportLoader", () => ({
  loadBasicScriptExport: vi.fn(),
  loadXlsxScriptExport: vi.fn(),
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
});
