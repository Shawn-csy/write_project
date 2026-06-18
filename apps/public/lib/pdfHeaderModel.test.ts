import { describe, it, expect } from "vitest";
import { buildPdfHeaderHtml } from "./pdfHeaderModel";
import type { ReadWorkHeaderModel } from "./readWorkHeaderModel";

const BASE: ReadWorkHeaderModel = {
  title: "Test Script",
  synopsis: undefined,
  coverUrl: undefined,
  coverCrop: null,
  coverDesign: null,
  author: null,
  organization: null,
  series: null,
  views: 0, likes: 0, isLiked: false,
  durationMinutes: undefined, dialogueChars: undefined,
  tags: [], license: "", commercialUse: "", derivativeUse: "",
  notifyOnModify: "", licenseSpecialTerms: [], targetAudience: "",
  contentRating: "", prefaceItems: [], demoLinks: [], customFields: [],
};

describe("buildPdfHeaderHtml", () => {
  it("includes title", () => {
    expect(buildPdfHeaderHtml(BASE)).toContain("Test Script");
  });

  it("includes cover img when coverUrl present", () => {
    const html = buildPdfHeaderHtml({ ...BASE, coverUrl: "https://example.com/cover.jpg" });
    expect(html).toContain("<img");
    expect(html).toContain("example.com/cover.jpg");
  });

  it("no img when no coverUrl", () => {
    expect(buildPdfHeaderHtml(BASE)).not.toContain("<img");
  });

  it("includes org name when present", () => {
    const html = buildPdfHeaderHtml({
      ...BASE,
      organization: { id: "o1", name: "年終五個月互助會", href: "/org/1", logoUrl: undefined },
    });
    expect(html).toContain("年終五個月互助會");
  });

  it("series order 2 renders 第 2 部", () => {
    const html = buildPdfHeaderHtml({
      ...BASE,
      series: { name: "女朋友", href: "/series/x", order: 2 },
    });
    expect(html).toContain("第 2 部");
  });

  it("series order 0 renders 設定／背景", () => {
    const html = buildPdfHeaderHtml({
      ...BASE,
      series: { name: "女朋友", href: "/series/x", order: 0 },
    });
    expect(html).toContain("設定／背景");
  });

  it("escapes HTML in title", () => {
    const html = buildPdfHeaderHtml({ ...BASE, title: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
