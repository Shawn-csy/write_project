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
