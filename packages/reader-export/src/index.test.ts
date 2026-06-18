import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildPrintHtml } from "./printHtml";
import { getRenderedSnapshot, pickRenderedRoot } from "./exportShared";

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
