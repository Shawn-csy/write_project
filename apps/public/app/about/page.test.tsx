import { describe, it, expect } from "vitest";
import { metadata } from "./page";
import { SITE_VERSION } from "@/lib/siteVersion";

describe("/about page metadata", () => {
  it("has canonical href", () => {
    expect((metadata.alternates as { canonical: string }).canonical).toMatch(/\/about$/);
  });

  it("title contains 關於", () => {
    expect(String(metadata.title)).toContain("關於");
  });

  it("openGraph url contains /about", () => {
    expect(String((metadata.openGraph as { url: string }).url)).toContain("/about");
  });

  it("no /gallery link in metadata urls", () => {
    const canonical = (metadata.alternates as { canonical: string }).canonical;
    expect(canonical).not.toMatch(/\/gallery/);
  });

  it("exposes the current site version", () => {
    expect(SITE_VERSION).toBe("0.7.1");
  });
});
