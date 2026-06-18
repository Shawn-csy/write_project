import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildPrintHtml } from "./printHtml";
import { getRenderedSnapshot, pickRenderedRoot } from "./exportShared";
import { buildExportMetadata, formatStructuredMetadataValue } from "./exportMetadata";

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

// ── formatStructuredMetadataValue ────────────────────────────────────────────

describe("formatStructuredMetadataValue", () => {
  it("decodes multi-mode JSON to readable name：text / name：text format", () => {
    const raw = JSON.stringify({ mode: "multi", items: [{ name: "小雨", text: "冷靜的觀察者" }, { name: "阿哲", text: "衝動但善良" }] });
    expect(formatStructuredMetadataValue(raw)).toBe("小雨：冷靜的觀察者 / 阿哲：衝動但善良");
  });

  it("returns plain string unchanged", () => {
    expect(formatStructuredMetadataValue("主角是學生")).toBe("主角是學生");
  });

  it("handles single-item multi array", () => {
    const raw = JSON.stringify({ mode: "multi", items: [{ name: "A", text: "B" }] });
    expect(formatStructuredMetadataValue(raw)).toBe("A：B");
  });

  it("returns empty string for empty input", () => {
    expect(formatStructuredMetadataValue("")).toBe("");
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

  it("RoleSetting JSON multi payload decoded to human-readable form", () => {
    const roleJson = JSON.stringify({ mode: "multi", items: [{ name: "小雨", text: "冷靜" }, { name: "阿哲", text: "衝動" }] });
    const meta = buildExportMetadata({ title: "T", customMetadata: [{ key: "RoleSetting", value: roleJson }] });
    const row = meta.rows.find((r) => r.startsWith("角色設定"));
    expect(row).toContain("小雨：冷靜");
    expect(row).toContain("阿哲：衝動");
    expect(row).not.toContain('"mode"');
  });

  it("activityName and activityContent from source top-level", () => {
    const meta = buildExportMetadata({ title: "T", activityName: "活動名稱", activityContent: "活動說明文字" });
    expect(meta.rows).toContain("活動：活動名稱：活動說明文字");
  });

  it("activityName only (no content)", () => {
    const meta = buildExportMetadata({ title: "T", activityName: "配音活動" });
    expect(meta.rows).toContain("活動：配音活動");
  });

  it("demoLinks from source", () => {
    const meta = buildExportMetadata({ title: "T", demoLinks: [{ name: "試聽01", url: "https://example.com/demo" }] });
    expect(meta.rows).toContain("試聽範例：試聽01：https://example.com/demo");
  });

  it("EventDemoLink legacy customMetadata key is emitted as demoLink row", () => {
    const meta = buildExportMetadata({ title: "T", customMetadata: [{ key: "EventDemoLink", value: "https://example.com/legacy-demo" }] });
    expect(meta.rows).toContain("試聽範例：https://example.com/legacy-demo");
  });

  it("targetAudience from customMetadata (P2 overlay alignment)", () => {
    const meta = buildExportMetadata({ title: "T", customMetadata: [{ key: "TargetAudience", value: "女性向" }] });
    expect(meta.rows.find((r) => r.startsWith("觀眾"))).toContain("女性向");
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
