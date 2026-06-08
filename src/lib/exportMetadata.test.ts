import { describe, expect, it } from "vitest";
import { buildExportMetadata, buildExportMetadataDocsBlocks, buildExportMetadataHtml, buildExportMetadataRows } from "./exportMetadata";

describe("exportMetadata", () => {
  it("builds non-empty export header rows from script metadata", () => {
    const metadata = buildExportMetadata({
      title: "作品標題",
      synopsis: "故事簡介",
      author: "資料表作者",
      draftDate: "2026-06-08",
      customMetadata: [
        { key: "AuthorDisplayMode", value: "override" },
        { key: "Author", value: "覆寫作者" },
        { key: "Contact", value: JSON.stringify({ email: "a@example.com" }) },
      ],
      organization: { name: "組織名" },
      series: { name: "系列名" },
      seriesOrder: 2,
      tags: [{ name: "全年齡" }, { name: "普遍級" }],
      licenseCommercial: "allow",
      licenseDerivative: "limited",
      licenseNotify: "required",
    }, "fallback");

    expect(metadata.title).toBe("作品標題");
    expect(metadata.synopsis).toBe("故事簡介");
    expect(metadata.rows).toContain("組織：組織名");
    expect(metadata.rows).toContain("作者：覆寫作者");
    expect(metadata.rows).toContain("日期：2026-06-08");
    expect(metadata.rows).toContain("系列：系列名 #2");
    expect(metadata.rows).toContain("標籤：全年齡、普遍級");
    expect(metadata.rows).toContain("聯絡：email: a@example.com");
    expect(metadata.rows).toContain("商業使用：可");
    expect(metadata.rows).toContain("改作許可：需同意");
    expect(metadata.rows).toContain("修改通知：需要");
  });

  it("renders metadata for PDF and Google Docs/table exports", () => {
    const metadata = buildExportMetadata({ title: "T", author: "A" });

    expect(buildExportMetadataHtml(metadata)).toContain("作者：A");
    expect(buildExportMetadataDocsBlocks(metadata).map((block) => block.runs.map((run) => run.text).join(""))).toContain("作者：A");
    expect(buildExportMetadataRows(metadata)).toContain("作者：A");
  });
});
