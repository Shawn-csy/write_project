import { describe, it, expect } from "vitest";
import { metadata } from "./page";

describe("/help page metadata", () => {
  it("has canonical href", () => {
    expect((metadata.alternates as { canonical: string }).canonical).toMatch(/\/help$/);
  });

  it("title contains 使用說明", () => {
    expect(String(metadata.title)).toContain("使用說明");
  });

  it("openGraph url contains /help", () => {
    expect(String((metadata.openGraph as { url: string }).url)).toContain("/help");
  });

  it("no /gallery link in metadata urls", () => {
    const canonical = (metadata.alternates as { canonical: string }).canonical;
    expect(canonical).not.toMatch(/\/gallery/);
  });
});
