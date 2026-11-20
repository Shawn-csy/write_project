import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLiveEditorDownloadOptions } from "./useLiveEditorDownloadOptions";

vi.mock("../../lib/scriptExportLoader", () => ({
  loadBasicScriptExport: vi.fn(),
  loadXlsxScriptExport: vi.fn(),
}));
vi.mock("../../lib/api/export", () => ({
  exportProductionScriptAsDocx: vi.fn(),
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
import { exportProductionScriptAsDocx } from "../../lib/api/export";
import { getDefaultMarkerRules } from "@write/script-engine";

describe("useLiveEditorDownloadOptions", () => {
  it("exports production rows from the current text and active rules without rendering HTML", async () => {
    const ensureRenderedHtml = vi.fn();
    const markerConfigs = getDefaultMarkerRules();
    markerConfigs.find((rule: { id: string }) => rule.id === "character").start = "!角色";
    const { result } = renderHook(() => useLiveEditorDownloadOptions({
      t: (key) => key,
      title: "午夜列車",
      content: [
        "01. 月台", "!角色 小雨", "#D （低聲）你到了嗎？【混響】", "",
        "＃ＳＥ 車門", "@ 左方", ">>SE 風聲＜5s＞", "><SE 漸弱", "<<SE",
        "//BG 音樂", "/\\BG 淡入", "\\\\BG 淡出", "02. 車廂", "#D 上車吧。",
      ].join("\n"),
      renderedHtmlRef: { current: {} },
      ensureRenderedHtml,
      markerConfigs,
      metadataSource: {
        author: "小林",
        contentRating: "全年齡",
        customMetadata: [
          { key: "RoleSetting", value: "小雨，旅人" },
          { key: "ChapterSettings", value: JSON.stringify({
            mode: "chapter_multi",
            items: [{ chapter: "月台", situation: "等車", environment: "深夜" }],
          }) },
        ],
      },
    }));

    const option = () => result.current.find((item) => item.id === "production-script-docx");
    act(() => { option()?.onClick?.(); });
    render(option()?.renderDialog?.());
    fireEvent.click(screen.getByRole("button", { name: "productionExport.download" }));

    expect(ensureRenderedHtml).not.toHaveBeenCalled();
    await waitFor(() => expect(exportProductionScriptAsDocx).toHaveBeenCalledWith({
      title: "午夜列車",
      author: "小林",
      rating: "全年齡",
      work: [],
      characters: [["基本資料", "小雨，旅人"]],
      chapters: [{
        heading: "01. 月台",
        details: [["狀況", "等車"], ["環境", "深夜"]],
        rows: [
          { label: "小雨", text: "（低聲）你到了嗎？【混響】", kind: "speech" },
          { label: "", text: "", kind: "pause" },
          { label: "#SE", text: "車門", kind: "cue" },
          { label: "@", text: "左方", kind: "position" },
          { label: ">>SE", text: "風聲＜5s＞", kind: "cue" },
          { label: "><SE", text: "漸弱", kind: "cue" },
          { label: "<<SE", text: "", kind: "cue" },
          { label: "//BG", text: "音樂", kind: "cue" },
          { label: "/\\BG", text: "淡入", kind: "cue" },
          { label: "\\\\BG", text: "淡出", kind: "cue" },
        ],
      }, {
        heading: "02. 車廂",
        details: [],
        rows: [{ label: "", text: "上車吧。", kind: "speech" }],
      }],
    }));
  });

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
        isPresentationRendererEnabled: true,
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
        isPresentationRendererEnabled: false,
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
        isPresentationRendererEnabled: true,
      })
    );

    expect(result.current.some((o) => o.id === "google-docs-table")).toBe(false);
  });
});
