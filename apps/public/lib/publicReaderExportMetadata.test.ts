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

describe("buildPublicReaderExportMetadata", () => {
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

  it("maps tags", () => {
    const meta = buildPublicReaderExportMetadata(BASE);
    expect(meta.rows).toContain("標籤：全年齡、奇幻");
  });

  it("maps license rows", () => {
    const meta = buildPublicReaderExportMetadata(BASE);
    expect(meta.rows).toContain("商業使用：可");
    expect(meta.rows).toContain("改作許可：需同意");
    expect(meta.rows).toContain("修改通知：需要");
  });

  it("maps contact from customMetadata", () => {
    const script: PublicScript = {
      ...BASE,
      customMetadata: [{ key: "Contact", value: "Twitter: @example" }],
    };
    const meta = buildPublicReaderExportMetadata(script);
    expect(meta.rows).toContain("聯絡：Twitter: @example");
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
