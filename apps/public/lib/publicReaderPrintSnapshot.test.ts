import { describe, it, expect } from "vitest";
import { buildPublicReaderPrintSnapshot } from "./publicReaderPrintSnapshot";
import type { PublicScript } from "./types";

// Fixture based on the bad output documented in docs/read-page-export-metadata-projection.md:
//
//   未命名劇本
//   組織：NEON VOICE 霓聲工作室
//   作者：海聶
//   系列：ＡＡＡ #0
//   觀眾：男性向・成人向
//   角色設定：ＣＣ：ㄇ
//   BackgroundInfo：asdasd                               ← English key must not appear
//   PerformanceInstruction：{"mode":"multi",...}         ← raw JSON must not appear
//   OpeningIntro：asdasd                                 ← English key must not appear
//   ChapterSettings：{"mode":"chapter_multi",...}        ← raw JSON must not appear
//
const METADATA_RICH_SCRIPT: PublicScript = {
  id: "test-metadata-rich",
  title: "AAA",
  owner: { displayName: "海聶" },
  organization: { name: "NEON VOICE 霓聲工作室" },
  series: { name: "ＡＡＡ" },
  seriesOrder: 0,
  tags: [{ name: "男性向" }, { name: "成人向" }],
  customMetadata: [
    { key: "RoleSetting", value: JSON.stringify({ mode: "multi", items: [{ name: "ＣＣ", text: "ㄇ" }] }) },
    { key: "BackgroundInfo", value: "asdasd" },
    { key: "PerformanceInstruction", value: JSON.stringify({ mode: "multi", items: [{ name: "ＣＣ", text: "asdasd" }] }) },
    { key: "OpeningIntro", value: "asdasd" },
    { key: "ChapterSettings", value: JSON.stringify({ mode: "chapter_multi", items: [{ chapter: "asdasd", environment: "asd", situation: "asd" }] }) },
  ],
};

const DARK_BODY_HTML = `<article class="script-renderer"><div class="script-line" style="color:rgb(250,250,250);background-color:rgb(15,15,20)">台詞</div></article>`;

describe("buildPublicReaderPrintSnapshot — metadata rows", () => {
  it("title is AAA, not 未命名劇本", () => {
    const { metadata, headerHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    expect(metadata.title).toBe("AAA");
    expect(headerHtml).not.toContain("未命名劇本");
    expect(headerHtml).toContain("AAA");
  });

  it("headerHtml contains 背景資訊, not BackgroundInfo", () => {
    const { headerHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    expect(headerHtml).toContain("背景資訊：asdasd");
    expect(headerHtml).not.toContain("BackgroundInfo");
  });

  it("headerHtml contains decoded 演繹指示, not raw JSON", () => {
    const { headerHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    // Rich HTML: label heading + name：text lines
    expect(headerHtml).toContain("演繹指示");
    expect(headerHtml).toContain("ＣＣ");
    expect(headerHtml).toContain("asdasd");
    expect(headerHtml).not.toContain('"mode"');
    expect(headerHtml).not.toContain("PerformanceInstruction");
  });

  it("headerHtml contains 作品的開頭引言, not OpeningIntro", () => {
    const { headerHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    expect(headerHtml).toContain("作品的開頭引言：asdasd");
    expect(headerHtml).not.toContain("OpeningIntro");
  });

  it("headerHtml contains decoded 章節 as card HTML, not ChapterSettings raw JSON", () => {
    const { headerHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    // Rich HTML: chapter card with separate 環境 / 狀況 lines
    expect(headerHtml).toContain("章節");
    expect(headerHtml).toContain("asdasd");
    expect(headerHtml).toContain("環境");
    expect(headerHtml).toContain("狀況");
    expect(headerHtml).not.toContain("ChapterSettings");
    expect(headerHtml).not.toContain("chapter_multi");
    expect(headerHtml).not.toContain('"mode"');
  });

  it("headerHtml contains 角色設定 decoded as multi-line HTML, not RoleSetting raw JSON", () => {
    const { headerHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    // Rich HTML: label heading + ＣＣ：ㄇ line
    expect(headerHtml).toContain("角色設定");
    expect(headerHtml).toContain("ＣＣ");
    expect(headerHtml).toContain("ㄇ");
    expect(headerHtml).not.toContain("RoleSetting");
    expect(headerHtml).not.toContain('"mode"');
  });

  it("seriesOrder 0 appears as #0", () => {
    const { headerHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    expect(headerHtml).toContain("ＡＡＡ");
    expect(headerHtml).toContain("#0");
  });

  it("metadata.rows exact preface section — no English keys or raw JSON", () => {
    const { metadata } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    const prefaceRows = metadata.rows.filter((r) =>
      r.startsWith("角色設定") || r.startsWith("背景資訊") || r.startsWith("演繹指示") ||
      r.startsWith("作品的開頭引言") || r.startsWith("章節")
    );
    expect(prefaceRows).toEqual([
      "角色設定：ＣＣ：ㄇ",
      "背景資訊：asdasd",
      "演繹指示：ＣＣ：asdasd",
      "作品的開頭引言：asdasd",
      "章節：asdasd（環境：asd；狀況：asd）",
    ]);
  });
});

describe("buildPublicReaderPrintSnapshot — printHtml light theme baseline", () => {
  it("printHtml has color-scheme:light, white background, black text CSS rules", () => {
    const { printHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, DARK_BODY_HTML);
    expect(printHtml).toContain("color-scheme: light");
    expect(printHtml).toContain("background: white");
    expect(printHtml).toContain("color: black");
  });

  it("printHtml @media print overrides background and color", () => {
    const { printHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, DARK_BODY_HTML);
    expect(printHtml).toContain("@media print");
    expect(printHtml).toContain("background: white !important");
    expect(printHtml).toContain("color: black !important");
  });

  it("printHtml title matches script title", () => {
    const { printHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, "");
    expect(printHtml).toContain("<title>AAA</title>");
  });
});

describe("buildPublicReaderPrintSnapshot — dark inline color stripped from bodyHtml/printHtml", () => {
  it("near-white text color rgb(250,250,250) is stripped from bodyHtml", () => {
    const { bodyHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, DARK_BODY_HTML);
    expect(bodyHtml).not.toContain("rgb(250,250,250)");
  });

  it("near-black background rgb(15,15,20) is stripped from bodyHtml", () => {
    const { bodyHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, DARK_BODY_HTML);
    expect(bodyHtml).not.toContain("rgb(15,15,20)");
  });

  it("near-white text color is stripped from printHtml", () => {
    const { printHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, DARK_BODY_HTML);
    expect(printHtml).not.toContain("rgb(250,250,250)");
  });

  it("near-black background is stripped from printHtml", () => {
    const { printHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, DARK_BODY_HTML);
    expect(printHtml).not.toContain("rgb(15,15,20)");
  });

  it("background shorthand with dark rgb stripped from bodyHtml", () => {
    const bgShorthandHtml = `<div class="script-renderer"><div class="script-line" style="background:rgb(10,10,10)">line</div></div>`;
    const { bodyHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, bgShorthandHtml);
    expect(bodyHtml).not.toContain("rgb(10,10,10)");
  });

  it("background:oklch(...) stripped from bodyHtml", () => {
    const html = `<div class="script-renderer"><div class="script-line" style="background:oklch(0.15 0.02 240)">line</div></div>`;
    const { bodyHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, html);
    expect(bodyHtml).not.toContain("oklch(");
  });

  it("background:var(--background) stripped from bodyHtml", () => {
    const html = `<div class="script-renderer"><div class="script-line" style="background:var(--background)">line</div></div>`;
    const { bodyHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, html);
    expect(bodyHtml).not.toContain("var(--background)");
  });

  it("mid-luminance marker accent color rgb(180,60,60) survives in bodyHtml", () => {
    const markerHtml = `<div class="script-renderer"><span class="script-line" style="color:rgb(180,60,60)">marked</span></div>`;
    const { bodyHtml } = buildPublicReaderPrintSnapshot(METADATA_RICH_SCRIPT, markerHtml);
    expect(bodyHtml).toContain("rgb(180,60,60)");
  });
});

describe("buildPublicReaderPrintSnapshot — title fallback", () => {
  it("customMetadata.Title ignored — title absent falls back to 'Script'", () => {
    const script: PublicScript = {
      id: "x",
      title: "",
      customMetadata: [{ key: "Title", value: "自訂標題" }],
    };
    const { metadata } = buildPublicReaderPrintSnapshot(script, "");
    expect(metadata.title).toBe("Script");
  });

  it("top-level title takes precedence over customMetadata.Title", () => {
    const script: PublicScript = {
      id: "x",
      title: "正式標題",
      customMetadata: [{ key: "Title", value: "自訂標題" }],
    };
    const { metadata } = buildPublicReaderPrintSnapshot(script, "");
    expect(metadata.title).toBe("正式標題");
  });
});
