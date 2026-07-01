import { describe, it, expect } from "vitest";
import { metadata } from "./page";

describe("/terms page metadata", () => {
  it("has canonical href", () => {
    expect((metadata.alternates as { canonical: string }).canonical).toMatch(/\/terms$/);
  });

  it("title contains Terms of Service", () => {
    expect(String(metadata.title)).toContain("Terms of Service");
  });

  it("openGraph url contains /terms", () => {
    expect(String((metadata.openGraph as { url: string }).url)).toContain("/terms");
  });

  it("no /gallery link in metadata urls", () => {
    const canonical = (metadata.alternates as { canonical: string }).canonical;
    expect(canonical).not.toMatch(/\/gallery/);
  });
});
