import { describe, it, expect } from "vitest";
import { buildGoogleDocsBlocksFromRenderedHtml, buildGoogleDocsBlocksFromScript } from "./googleDocsExportModel";

describe("buildGoogleDocsBlocksFromScript", () => {
  it("applies inline renderer template and style for highlight runs", () => {
    // Use real engine parser: enclosure marker «content»
    const blocks = buildGoogleDocsBlocksFromScript("prefix 《softly》 suffix", [
      {
        id: "tone",
        matchMode: "enclosure",
        start: "《",
        end: "》",
        style: { fontStyle: "italic", color: "#666666" },
        renderer: { template: "({{content}})" },
      },
    ]);

    expect(blocks.length).toBeGreaterThan(0);
    const allRuns = blocks.flatMap((b) => b.runs);
    const highlight = allRuns.find((r) => r.italic);
    expect(highlight).toBeDefined();
    expect(highlight!.text).toBe("(softly)");
    expect(highlight!.color).toBe("#666666");
    expect(highlight!.italic).toBe(true);
  });

  it("shows inline delimiters when marker requests them", () => {
    const blocks = buildGoogleDocsBlocksFromScript("prefix 《softly》 suffix", [
      {
        id: "tone",
        matchMode: "enclosure",
        start: "《",
        end: "》",
        showDelimiters: true,
      },
    ]);

    const allText = blocks.flatMap((b) => b.runs).map((r) => r.text).join("");
    expect(allText).toContain("《softly》");
  });

  it("marks scene heading as bold and assigns character color", () => {
    // Use plain prefix that leaves text after it so $text is non-empty
    const blocks = buildGoogleDocsBlocksFromScript(
      "INT. Opening\n角色 Amy",
      [
        { id: "scene", start: "INT.", matchMode: "prefix", parseAs: "scene_heading", mapFields: { text: "$text" } },
        { id: "character", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
      ]
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0].runs[0].text).toContain("Opening");
    expect(blocks[0].runs[0].bold).toBe(true);
    expect(blocks[1].runs[0].bold).toBe(true);
    // character color assigned from sequence
    expect(blocks[1].runs[0].color).toBeTruthy();
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
  it("applies range continuity prefix and style to inner lines", () => {
    const content = `<s>
這是大綱內容
</s>`;

    const configs = [
      {
        id: "summary",
        label: "大綱",
        matchMode: "range",
        start: "<s>",
        end: "</s>",
        style: {
          fontWeight: "bold",
          fontStyle: "italic",
        },
      },
    ] as any;

    const blocks = buildGoogleDocsBlocksFromScript(content, configs);
    const joined = blocks.map((b) => b.runs.map((r) => r.text).join("")).join("\n");
    expect(joined).toContain("這是大綱內容");

    // inner lines get continuity prefix
    const innerLine = blocks.find((b) => b.runs.some((r) => r.text.includes("這是大綱內容")));
    expect(innerLine).toBeTruthy();
    const run = innerLine!.runs.find((r) => r.text.includes("這是大綱內容"))!;
    expect(run.text.startsWith("│ ")).toBe(true);
    expect(run.bold).toBe(true);
    expect(run.italic).toBe(true);
  });
});
