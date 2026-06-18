import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildPrintHtml } from "./printHtml";
import { getRenderedSnapshot, pickRenderedRoot } from "./exportShared";
import { buildExportMetadata } from "./exportMetadata";

// ── buildPrintHtml ────────────────────────────────────────────────────────────

describe("buildPrintHtml", () => {
  it("returns valid HTML string containing script content", () => {
    const html = buildPrintHtml({ titleName: "My Script", rawScriptHtml: "<p>Line 1</p>" });
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("My Script");
    expect(html).toContain("<p>Line 1</p>");
  });

  it("wraps rawScriptHtml in .script-renderer article", () => {
    const html = buildPrintHtml({ rawScriptHtml: "<span>text</span>" });
    expect(html).toContain('<article class="script-renderer">');
    expect(html).toContain("<span>text</span>");
  });

  it("includes print @media CSS", () => {
    const html = buildPrintHtml({});
    expect(html).toContain("@media print");
    expect(html).toContain("background: white");
  });

  it("uses activeFile as title fallback", () => {
    const html = buildPrintHtml({ activeFile: "FallbackTitle" });
    expect(html).toContain("FallbackTitle");
  });

  it("renders empty body when no rawScriptHtml", () => {
    const html = buildPrintHtml({});
    expect(html).toContain('<article class="script-renderer"></article>');
  });

  it("forces light color-scheme to prevent dark-mode bleed in print", () => {
    const html = buildPrintHtml({});
    expect(html).toContain("color-scheme: light");
  });

  it("sets body color: black as light-theme baseline", () => {
    const html = buildPrintHtml({});
    expect(html).toContain("color: black");
  });
});

// ── getRenderedSnapshot (fallback path, no DOM) ───────────────────────────────

describe("getRenderedSnapshot — text fallback", () => {
  it("returns lines from plain text when no DOM renderer", () => {
    const { lines } = getRenderedSnapshot({ text: "Line A\nLine B" });
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("Line A");
    expect(lines[1].text).toBe("Line B");
    expect(lines[0].line).toBe(1);
    expect(lines[1].line).toBe(2);
  });

  it("html wraps each line in div with white-space:pre-wrap", () => {
    const { html } = getRenderedSnapshot({ text: "Hello" });
    expect(html).toContain("white-space:pre-wrap");
    expect(html).toContain("Hello");
  });

  it("empty text yields one blank line", () => {
    const { lines } = getRenderedSnapshot({ text: "" });
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("");
  });

  it("normalizes CRLF to LF", () => {
    const { lines } = getRenderedSnapshot({ text: "A\r\nB" });
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("A");
  });
});

// ── buildExportMetadata — metadata depth ─────────────────────────────────────

describe("buildExportMetadata — metadata depth", () => {
  it("seriesOrder 0 is preserved, not treated as falsy", () => {
    const meta = buildExportMetadata({ title: "T", series: { name: "S" }, seriesOrder: 0 });
    expect(meta.rows).toContain("系列：S #0");
  });

  it("role setting from customMetadata key RoleSetting", () => {
    const meta = buildExportMetadata({ title: "T", customMetadata: [{ key: "RoleSetting", value: "主角：A" }] });
    expect(meta.rows).toContain("角色設定：主角：A");
  });

  it("situation info from customMetadata key SituationInfo", () => {
    const meta = buildExportMetadata({ title: "T", customMetadata: [{ key: "SituationInfo", value: "夜晚教室" }] });
    expect(meta.rows).toContain("狀況：夜晚教室");
  });

  it("arbitrary custom field appears and is not filtered out", () => {
    const meta = buildExportMetadata({ title: "T", customMetadata: [{ key: "備注", value: "演出重點" }] });
    expect(meta.rows).toContain("備注：演出重點");
  });

  it("reserved key 'synopsis' in customMetadata does NOT create customField row", () => {
    const meta = buildExportMetadata({ title: "T", synopsis: "直接簡介", customMetadata: [{ key: "Synopsis", value: "custom路徑" }] });
    expect(meta.rows.filter((r) => r.startsWith("Synopsis"))).toHaveLength(0);
  });

  it("licenseSpecialTerms from JSON array string in meta", () => {
    const meta = buildExportMetadata({ title: "T", customMetadata: [{ key: "LicenseSpecialTerms", value: JSON.stringify(["條款A", "條款B"]) }] });
    expect(meta.rows).toContain("特殊條款：條款A");
    expect(meta.rows).toContain("特殊條款：條款B");
  });

  it("licenseSpecialTerms from source top-level array of objects with .text", () => {
    const meta = buildExportMetadata({ title: "T", licenseSpecialTerms: [{ text: "禁商業" }, { text: "禁改編" }] });
    expect(meta.rows).toContain("特殊條款：禁商業");
    expect(meta.rows).toContain("特殊條款：禁改編");
  });
});

// ── pickRenderedRoot ──────────────────────────────────────────────────────────

describe("pickRenderedRoot", () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement("div");
    div.className = "script-renderer";
    div.textContent = "content";
    document.body.appendChild(div);
  });

  afterEach(() => {
    div.remove();
  });

  it("finds .script-renderer element in DOM", () => {
    const root = pickRenderedRoot();
    expect(root).not.toBeNull();
    expect(root?.className).toContain("script-renderer");
  });
});
