import { describe, it, expect } from "vitest";
import { metadata } from "./page";

describe("/license page metadata", () => {
  it("has canonical href", () => {
    expect((metadata.alternates as { canonical: string }).canonical).toMatch(/\/license$/);
  });

  it("title contains 授權說明", () => {
    expect(String(metadata.title)).toContain("授權說明");
  });

  it("openGraph url contains /license", () => {
    expect(String((metadata.openGraph as { url: string }).url)).toContain("/license");
  });

  it("no /gallery link in metadata urls", () => {
    const canonical = (metadata.alternates as { canonical: string }).canonical;
    expect(canonical).not.toMatch(/\/gallery/);
  });
});
