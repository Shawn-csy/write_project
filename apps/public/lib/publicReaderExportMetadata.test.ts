import { describe, it, expect } from "vitest";
import { buildPublicReaderExportMetadata } from "./publicReaderExportMetadata";
import type { PublicScript } from "./types";

const BASE: PublicScript = {
  id: "s1",
  title: "台本標題",
  synopsis: "簡介文字",
  coverUrl: "https://example.com/cover.jpg",
  owner: { displayName: "作者名" },
  organization: { name: "組織名" },
  series: { name: "系列名" },
  seriesOrder: 3,
  tags: [{ name: "全年齡" }, { name: "奇幻" }],
  licenseCommercial: "allow",
  licenseDerivative: "limited",
  licenseNotify: "required",
  persona: null,
  customMetadata: [],
};

describe("buildPublicReaderExportMetadata — basic fields", () => {
  it("maps title and synopsis", () => {
    const meta = buildPublicReaderExportMetadata(BASE);
    expect(meta.title).toBe("台本標題");
    expect(meta.synopsis).toBe("簡介文字");
  });

  it("maps author from owner.displayName", () => {
    const meta = buildPublicReaderExportMetadata(BASE);
    expect(meta.rows).toContain("作者：作者名");
  });

  it("maps organization", () => {
    const meta = buildPublicReaderExportMetadata(BASE);
    expect(meta.rows).toContain("組織：組織名");
  });

  it("maps series with order", () => {
    const meta = buildPublicReaderExportMetadata(BASE);
    expect(meta.rows).toContain("系列：系列名 #3");
  });

  it("maps license rows", () => {
    const meta = buildPublicReaderExportMetadata(BASE);
    expect(meta.rows).toContain("商業使用：可");
    expect(meta.rows).toContain("改作許可：需同意");
    expect(meta.rows).toContain("修改通知：需要");
  });

  it("persona displayName used as author when owner absent", () => {
    const script: PublicScript = {
      ...BASE,
      owner: undefined,
      persona: { displayName: "筆名", defaultLicenseCommercial: "allow", defaultLicenseDerivative: "allow", defaultLicenseNotify: "not-required" },
    };
    const meta = buildPublicReaderExportMetadata(script);
    expect(meta.rows).toContain("作者：筆名");
  });

  it("no fields for absent optional values", () => {
    const minimal: PublicScript = { id: "x", title: "T" };
    const meta = buildPublicReaderExportMetadata(minimal);
    expect(meta.title).toBe("T");
    expect(meta.synopsis).toBe("");
    expect(meta.rows.filter((r) => r.startsWith("組織"))).toHaveLength(0);
    expect(meta.rows.filter((r) => r.startsWith("系列"))).toHaveLength(0);
  });
});

describe("buildPublicReaderExportMetadata — seriesOrder edge cases", () => {
  it("seriesOrder 0 appears as #0, not omitted", () => {
    const meta = buildPublicReaderExportMetadata({ ...BASE, seriesOrder: 0 });
    expect(meta.rows).toContain("系列：系列名 #0");
  });

  it("seriesOrder null → no order suffix", () => {
    const meta = buildPublicReaderExportMetadata({ ...BASE, seriesOrder: null });
    const seriesRow = meta.rows.find((r) => r.startsWith("系列"));
    expect(seriesRow).toBe("系列：系列名");
  });
});

describe("buildPublicReaderExportMetadata — customMetadata depth", () => {
  it("role setting (RoleSetting) appears in rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "RoleSetting", value: "主角是學生，配角是老師" }],
    });
    expect(meta.rows).toContain("角色設定：主角是學生，配角是老師");
  });

  it("situation info (SituationInfo) appears in rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "SituationInfo", value: "開場在學校走廊" }],
    });
    expect(meta.rows).toContain("狀況：開場在學校走廊");
  });

  it("arbitrary non-reserved custom field appears in rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "特別備注", value: "配音時注意停頓" }],
    });
    expect(meta.rows).toContain("特別備注：配音時注意停頓");
  });

  it("contact field appears in rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "Contact", value: "Twitter: @example" }],
    });
    expect(meta.rows).toContain("聯絡：Twitter: @example");
  });

  it("reserved keys (synopsis, licensecommercial) do NOT appear as customField rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [
        { key: "Synopsis", value: "不應出現為 customField" },
        { key: "LicenseCommercial", value: "allow" },
      ],
    });
    const customFieldRows = meta.rows.filter((r) => r.startsWith("Synopsis") || r.startsWith("LicenseCommercial"));
    expect(customFieldRows).toHaveLength(0);
  });
});

describe("buildPublicReaderExportMetadata — audience / content rating", () => {
  it("audience tag extracted from tags array", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      tags: [{ name: "女性向" }, { name: "奇幻" }],
    });
    expect(meta.rows.find((r) => r.startsWith("觀眾"))).toContain("女性向");
  });

  it("rating tag extracted from tags array", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      tags: [{ name: "成人向" }],
    });
    expect(meta.rows.find((r) => r.startsWith("觀眾"))).toContain("成人向");
  });

  it("audience and rating combined when both present", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      tags: [{ name: "女性向" }, { name: "全年齡向" }],
    });
    const audienceRow = meta.rows.find((r) => r.startsWith("觀眾"));
    expect(audienceRow).toContain("女性向");
    expect(audienceRow).toContain("全年齡向");
  });

  it("audience/rating tags do NOT appear in regular tags row", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      tags: [{ name: "女性向" }, { name: "奇幻" }],
    });
    const tagsRow = meta.rows.find((r) => r.startsWith("標籤"));
    expect(tagsRow).not.toContain("女性向");
    expect(tagsRow).toContain("奇幻");
  });
});

describe("buildPublicReaderExportMetadata — activity / demo links", () => {
  it("activityName appears in rows", () => {
    const meta = buildPublicReaderExportMetadata({ ...BASE, activityName: "配音活動", activityContent: null });
    expect(meta.rows).toContain("活動：配音活動");
  });

  it("activityName + activityContent combined in row", () => {
    const meta = buildPublicReaderExportMetadata({ ...BASE, activityName: "活動X", activityContent: "活動說明" });
    expect(meta.rows).toContain("活動：活動X：活動說明");
  });

  it("activityDemoLinks JSON string parsed and emitted as demoLink rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      activityDemoLinks: JSON.stringify([{ name: "試聽範例", url: "https://example.com/demo" }]),
    });
    expect(meta.rows).toContain("試聽範例：試聽範例：https://example.com/demo");
  });

  it("RoleSetting JSON decoded — no raw JSON in rows", () => {
    const roleJson = JSON.stringify({ mode: "multi", items: [{ name: "A", text: "B" }] });
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "RoleSetting", value: roleJson }],
    });
    const row = meta.rows.find((r) => r.startsWith("角色設定"));
    expect(row).toContain("A：B");
    expect(row).not.toContain('"mode"');
  });
});

describe("buildPublicReaderExportMetadata — license special terms", () => {
  it("licenseSpecialTerms from customMetadata (legacy JSON array) appears in rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "LicenseSpecialTerms", value: JSON.stringify(["禁止商業配音", "禁止二次改編"]) }],
    });
    expect(meta.rows).toContain("特殊條款：禁止商業配音");
    expect(meta.rows).toContain("特殊條款：禁止二次改編");
  });
});

describe("buildPublicReaderExportMetadata — preface fields (Phase 3 fixture)", () => {
  it("BackgroundInfo appears as 背景資訊", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "BackgroundInfo", value: "asdasd" }],
    });
    expect(meta.rows).toContain("背景資訊：asdasd");
  });

  it("OpeningIntro appears as 作品的開頭引言", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "OpeningIntro", value: "asdasd" }],
    });
    expect(meta.rows).toContain("作品的開頭引言：asdasd");
  });

  it("PerformanceInstruction JSON multi decoded — no raw JSON", () => {
    const json = JSON.stringify({ mode: "multi", items: [{ name: "CC", text: "asdasd" }] });
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "PerformanceInstruction", value: json }],
    });
    const row = meta.rows.find((r) => r.startsWith("演繹指示"));
    expect(row).toContain("CC：asdasd");
    expect(row).not.toContain('"mode"');
  });

  it("ChapterSettings JSON chapter_multi decoded correctly", () => {
    const json = JSON.stringify({ mode: "chapter_multi", items: [{ chapter: "asdasd", environment: "asd", situation: "asd" }] });
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [{ key: "ChapterSettings", value: json }],
    });
    const row = meta.rows.find((r) => r.startsWith("章節"));
    expect(row).toContain("asdasd（環境：asd；狀況：asd）");
    expect(row).not.toContain('"mode"');
  });

  it("preface keys do NOT appear as raw customField rows", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      customMetadata: [
        { key: "BackgroundInfo", value: "bg" },
        { key: "PerformanceInstruction", value: "pi" },
        { key: "ChapterSettings", value: "cs" },
        { key: "OpeningIntro", value: "oi" },
      ],
    });
    const rawKeyRows = meta.rows.filter((r) =>
      r.startsWith("BackgroundInfo") || r.startsWith("PerformanceInstruction") ||
      r.startsWith("ChapterSettings") || r.startsWith("OpeningIntro")
    );
    expect(rawKeyRows).toHaveLength(0);
  });

  it("title fallback to customMetadata.Title when top-level title missing", () => {
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      title: "",
      customMetadata: [{ key: "Title", value: "自訂標題" }],
    });
    expect(meta.title).toBe("自訂標題");
  });

  it("metadata-rich fixture — exact preface row output", () => {
    const json = JSON.stringify({ mode: "multi", items: [{ name: "CC", text: "m" }] });
    const piJson = JSON.stringify({ mode: "multi", items: [{ name: "CC", text: "asdasd" }] });
    const chJson = JSON.stringify({ mode: "chapter_multi", items: [{ chapter: "asdasd", environment: "asd", situation: "asd" }] });
    const meta = buildPublicReaderExportMetadata({
      ...BASE,
      title: "AAA",
      outline: "劇情大綱",
      owner: undefined,
      organization: undefined,
      series: undefined,
      seriesOrder: undefined,
      tags: [],
      licenseCommercial: undefined,
      licenseDerivative: undefined,
      licenseNotify: undefined,
      customMetadata: [
        { key: "RoleSetting", value: json },
        { key: "BackgroundInfo", value: "asdasd" },
        { key: "PerformanceInstruction", value: piJson },
        { key: "OpeningIntro", value: "asdasd" },
        { key: "ChapterSettings", value: chJson },
      ],
    });
    expect(meta.title).toBe("AAA");
    // Extract only preface-related rows for exact equality — locks order and content
    const prefaceRows = meta.rows.filter((r) =>
      r.startsWith("大綱") || r.startsWith("角色設定") || r.startsWith("背景資訊") ||
      r.startsWith("演繹指示") || r.startsWith("作品的開頭引言") || r.startsWith("章節")
    );
    expect(prefaceRows).toEqual([
      "大綱：劇情大綱",
      "角色設定：CC：m",
      "背景資訊：asdasd",
      "演繹指示：CC：asdasd",
      "作品的開頭引言：asdasd",
      "章節：asdasd（環境：asd；狀況：asd）",
    ]);
  });

  it("top-level outline passed from PublicScript appears as 大綱", () => {
    const meta = buildPublicReaderExportMetadata({ ...BASE, outline: "故事大綱內容" });
    expect(meta.rows).toContain("大綱：故事大綱內容");
  });
});
