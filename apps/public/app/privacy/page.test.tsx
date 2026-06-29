import { describe, it, expect } from "vitest";
import { metadata } from "./page";

describe("/privacy page metadata", () => {
  it("has canonical href", () => {
    expect((metadata.alternates as { canonical: string }).canonical).toMatch(/\/privacy$/);
  });

  it("title contains Privacy Policy", () => {
    expect(String(metadata.title)).toContain("Privacy Policy");
  });

  it("openGraph url contains /privacy", () => {
    expect(String((metadata.openGraph as { url: string }).url)).toContain("/privacy");
  });

  it("no /gallery link in metadata urls", () => {
    const canonical = (metadata.alternates as { canonical: string }).canonical;
    expect(canonical).not.toMatch(/\/gallery/);
  });
});
