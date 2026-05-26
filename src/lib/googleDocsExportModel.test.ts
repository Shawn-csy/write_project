import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./screenplayAST", () => ({
  parseScreenplay: vi.fn(),
}));

vi.mock("./parsers/inlineParser", () => ({
  parseInline: vi.fn(),
}));

import { parseScreenplay } from "./screenplayAST";
import { parseInline } from "./parsers/inlineParser";
import { buildGoogleDocsBlocksFromRenderedHtml, buildGoogleDocsBlocksFromScript } from "./googleDocsExportModel";

describe("buildGoogleDocsBlocksFromScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies inline renderer template and style for highlight runs", () => {
    (parseScreenplay as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ast: {
        children: [{ type: "action", text: "line with inline" }],
      },
    });
    (parseInline as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { type: "text", content: "prefix " },
      { type: "highlight", id: "tone", content: "softly" },
      { type: "text", content: " suffix" },
    ]);

    const blocks = buildGoogleDocsBlocksFromScript("raw", [
      {
        id: "tone",
        matchMode: "inline",
        start: "(",
        end: ")",
        style: { fontStyle: "italic", color: "#666666" },
        renderer: { template: "({{content}})" },
      },
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].runs).toEqual([
      { text: "prefix ", bold: false, italic: false, underline: false, color: undefined },
      { text: "(softly)", bold: false, italic: true, underline: false, color: "#666666" },
      { text: " suffix", bold: false, italic: false, underline: false, color: undefined },
    ]);
  });

  it("marks scene heading and character as bold and assigns character color", () => {
    (parseScreenplay as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ast: {
        children: [
          { type: "scene_heading", text: "1. Opening", markerId: "scene" },
          { type: "character", text: "Amy", markerId: "character" },
        ],
      },
    });
    (parseInline as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const blocks = buildGoogleDocsBlocksFromScript("raw", [
      { id: "scene", matchMode: "regex", style: { color: "#1E3A8A", fontWeight: "bold" } },
      { id: "character", matchMode: "prefix", style: { fontWeight: "bold" } },
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].runs[0].text).toBe("1. Opening");
    expect(blocks[0].runs[0].bold).toBe(true);
    expect(blocks[1].runs[0].text).toBe("Amy");
    expect(blocks[1].runs[0].bold).toBe(true);
    expect(blocks[1].runs[0].color).toBe("#8B5E3C");
  });
});

describe("buildGoogleDocsBlocksFromRenderedHtml", () => {
  it("extracts script-line styles including color and bold", () => {
    const html = `
      <div class="wrapper">
        <div class="script-line"><span style="color:#374151;font-style:italic;">章節 1：開關就這樣被打開了</span></div>
        <div class="script-line"><span style="color:#70552D;font-weight:bold;">10</span></div>
      </div>
    `;
    const blocks = buildGoogleDocsBlocksFromRenderedHtml(html);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].runs[0]).toMatchObject({
      text: "章節 1：開關就這樣被打開了",
      italic: true,
      color: "#374151",
    });
    expect(blocks[1].runs[0]).toMatchObject({
      text: "10",
      bold: true,
      color: "#70552D",
    });
  });

  it("includes layer/range lines that use data-line-start without script-line class", () => {
    const html = `
      <div class="legacy-section-continuous-layer layer-node" data-marker-id="legacy-section">
        <div class="legacy-section-continuous-label layer-label">
          <span data-line-start="22" data-line-end="22" style="color:#374151;font-style:italic;">/>章節 1：開關就這樣被打開了</span>
        </div>
      </div>
    `;
    const blocks = buildGoogleDocsBlocksFromRenderedHtml(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].runs[0]).toMatchObject({
      text: "│ />章節 1：開關就這樣被打開了",
      italic: true,
      color: "#374151",
    });
  });

  it("adds continuity prefix for lines inside range-content", () => {
    const html = `
      <div class="range-node">
        <div class="range-content">
          <p class="script-action" data-line-start="30" data-line-end="30">
            <span class="script-line">內容行</span>
          </p>
        </div>
      </div>
    `;
    const blocks = buildGoogleDocsBlocksFromRenderedHtml(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].runs[0].text).toBe("│ 內容行");
  });
});

describe("buildGoogleDocsBlocksFromScript range style", () => {
  it("applies summary range style to inner lines", () => {
    (parseScreenplay as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ast: {
        children: [
          {
            type: "range",
            layerType: "summary",
            startNode: { type: "layer", layerType: "summary", text: "大綱開始" },
            children: [{ type: "action", text: "這是大綱內容" }],
            endNode: { type: "layer", layerType: "summary", text: "大綱結束" },
          },
        ],
      },
    });
    (parseInline as unknown as ReturnType<typeof vi.fn>).mockImplementation((line: string) => [{ type: "text", content: line }]);

    const configs = [
      {
        id: "summary",
        label: "大綱",
        type: "block",
        matchMode: "range",
        start: "<s>",
        end: "</s>",
        isBlock: true,
        priority: 950,
        style: {
          color: "var(--marker-color-charcoal)",
          fontWeight: "bold",
          fontStyle: "italic",
        },
      },
    ] as any;

    const blocks = buildGoogleDocsBlocksFromScript("raw", configs);
    const joined = blocks.map((b) => b.runs.map((r) => r.text).join("")).join("\n");
    expect(joined).toContain("大綱開始");
    expect(joined).toContain("這是大綱內容");
    expect(joined).toContain("大綱結束");

    const summaryLine = blocks.find((b) => b.runs.some((r) => r.text.includes("這是大綱內容")));
    expect(summaryLine).toBeTruthy();
    const run = summaryLine!.runs.find((r) => r.text.includes("這是大綱內容"))!;
    expect(run.bold).toBe(true);
    expect(run.italic).toBe(true);
    expect(run.color).toBe("#333333");
    expect(run.text.startsWith("│ ")).toBe(true);
  });
});
