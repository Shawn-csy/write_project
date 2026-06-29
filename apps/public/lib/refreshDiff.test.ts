import { describe, it, expect } from "vitest";
import { arePublicScriptsEquivalent, areHeroSlidesEquivalent } from "./refreshDiff";
import type { PublicScript } from "./types";
import type { HeroSlide } from "@write/public-ui";

const s = (overrides: Partial<PublicScript> & { id: string }): PublicScript =>
  ({ title: "T", ...overrides } as PublicScript);

const slide = (overrides: Partial<HeroSlide> & { id: string | number }): HeroSlide =>
  ({ title: "T", ...overrides });

// ─── arePublicScriptsEquivalent ──────────────────────────────────────────────

describe("arePublicScriptsEquivalent", () => {
  it("empty arrays are equivalent", () => {
    expect(arePublicScriptsEquivalent([], [])).toBe(true);
  });

  it("same fields → equivalent", () => {
    const a = [s({ id: "1", title: "T", lastModified: 100 })];
    const b = [s({ id: "1", title: "T", lastModified: 100 })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(true);
  });

  it("different length → not equivalent", () => {
    expect(arePublicScriptsEquivalent([s({ id: "1" })], [])).toBe(false);
  });

  it("different id → not equivalent", () => {
    expect(arePublicScriptsEquivalent([s({ id: "1" })], [s({ id: "2" })])).toBe(false);
  });

  it("different title → not equivalent", () => {
    const a = [s({ id: "1", title: "Old" })];
    const b = [s({ id: "1", title: "New" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different lastModified → not equivalent", () => {
    const a = [s({ id: "1", lastModified: 100 })];
    const b = [s({ id: "1", lastModified: 200 })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("falls back to updatedAt when lastModified absent", () => {
    const a = [s({ id: "1", updatedAt: 100 })];
    const b = [s({ id: "1", updatedAt: 100 })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(true);
  });

  it("updatedAt differs → not equivalent", () => {
    const a = [s({ id: "1", updatedAt: 100 })];
    const b = [s({ id: "1", updatedAt: 200 })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different coverUrl → not equivalent", () => {
    const a = [s({ id: "1", coverUrl: "https://example.com/a.jpg" })];
    const b = [s({ id: "1", coverUrl: "https://example.com/b.jpg" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different coverCrop → not equivalent", () => {
    const a = [s({ id: "1", coverCrop: { cx: 0.5, cy: 0.5, zoom: 1 } })];
    const b = [s({ id: "1", coverCrop: { cx: 0.3, cy: 0.5, zoom: 1 } })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different tags → not equivalent", () => {
    const a = [s({ id: "1", tags: [{ name: "drama" }] })];
    const b = [s({ id: "1", tags: [{ name: "comedy" }] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different synopsis → not equivalent", () => {
    const a = [s({ id: "1", synopsis: "old" })];
    const b = [s({ id: "1", synopsis: "new" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different seriesId → not equivalent", () => {
    const a = [s({ id: "1", seriesId: "s1" })];
    const b = [s({ id: "1", seriesId: "s2" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different views → not equivalent", () => {
    const a = [s({ id: "1", views: 10 })];
    const b = [s({ id: "1", views: 20 })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different license → not equivalent", () => {
    const a = [s({ id: "1", license: "cc-by" })];
    const b = [s({ id: "1", license: "cc-by-nc" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different persona id → not equivalent", () => {
    const a = [s({ id: "1", persona: { id: "p1" } as PublicScript["persona"] })];
    const b = [s({ id: "1", persona: { id: "p2" } as PublicScript["persona"] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // coverDesign
  it("different coverDesign → not equivalent", () => {
    const a = [s({ id: "1", coverDesign: { style: "solid", color: "#ff0000" } as PublicScript["coverDesign"] })];
    const b = [s({ id: "1", coverDesign: { style: "solid", color: "#0000ff" } as PublicScript["coverDesign"] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // outline / customMetadata
  it("different outline → not equivalent", () => {
    const a = [s({ id: "1", outline: "Act 1" })];
    const b = [s({ id: "1", outline: "Act 2" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different customMetadata → not equivalent", () => {
    const a = [s({ id: "1", customMetadata: [{ key: "k", value: "v1" }] })];
    const b = [s({ id: "1", customMetadata: [{ key: "k", value: "v2" }] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // license detail fields
  it("different licenseSpecialTerms → not equivalent", () => {
    const a = [s({ id: "1", licenseSpecialTerms: "no AI" })];
    const b = [s({ id: "1", licenseSpecialTerms: "no AI training" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different licenseCommercial → not equivalent", () => {
    const a = [s({ id: "1", licenseCommercial: "no" })];
    const b = [s({ id: "1", licenseCommercial: "yes" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different licenseDerivative → not equivalent", () => {
    const a = [s({ id: "1", licenseDerivative: "no" })];
    const b = [s({ id: "1", licenseDerivative: "yes" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different licenseNotify → not equivalent", () => {
    const a = [s({ id: "1", licenseNotify: "no" })];
    const b = [s({ id: "1", licenseNotify: "yes" })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // contentLength
  it("different contentLength → not equivalent", () => {
    const a = [s({ id: "1", contentLength: 100 })];
    const b = [s({ id: "1", contentLength: 200 })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // owner display fields
  it("different owner displayName → not equivalent", () => {
    const a = [s({ id: "1", owner: { id: "o1", displayName: "Alice" } })];
    const b = [s({ id: "1", owner: { id: "o1", displayName: "Bob" } })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different owner avatar → not equivalent", () => {
    const a = [s({ id: "1", owner: { id: "o1", avatar: "https://example.com/a.jpg" } })];
    const b = [s({ id: "1", owner: { id: "o1", avatar: "https://example.com/b.jpg" } })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // persona display fields
  it("different persona displayName → not equivalent", () => {
    const a = [s({ id: "1", persona: { id: "p1", displayName: "Alice" } as PublicScript["persona"] })];
    const b = [s({ id: "1", persona: { id: "p1", displayName: "Alicia" } as PublicScript["persona"] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different persona defaultLicenseCommercial → not equivalent", () => {
    const a = [s({ id: "1", persona: { id: "p1", defaultLicenseCommercial: "no" } as PublicScript["persona"] })];
    const b = [s({ id: "1", persona: { id: "p1", defaultLicenseCommercial: "yes" } as PublicScript["persona"] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // organization display fields
  it("different organization name → not equivalent", () => {
    const a = [s({ id: "1", organization: { id: "org1", name: "Acme" } as PublicScript["organization"] })];
    const b = [s({ id: "1", organization: { id: "org1", name: "Beta" } as PublicScript["organization"] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different organization logoUrl → not equivalent", () => {
    const a = [s({ id: "1", organization: { id: "org1", logoUrl: "https://example.com/a.png" } as PublicScript["organization"] })];
    const b = [s({ id: "1", organization: { id: "org1", logoUrl: "https://example.com/b.png" } as PublicScript["organization"] })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  // nested series display fields
  it("different series name → not equivalent", () => {
    const a = [s({ id: "1", series: { id: "s1", name: "Arc 1" } })];
    const b = [s({ id: "1", series: { id: "s1", name: "Arc 2" } })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });

  it("different series coverUrl → not equivalent", () => {
    const a = [s({ id: "1", series: { id: "s1", coverUrl: "https://example.com/a.jpg" } })];
    const b = [s({ id: "1", series: { id: "s1", coverUrl: "https://example.com/b.jpg" } })];
    expect(arePublicScriptsEquivalent(a, b)).toBe(false);
  });
});

// ─── areHeroSlidesEquivalent ─────────────────────────────────────────────────

describe("areHeroSlidesEquivalent", () => {
  it("both undefined → equivalent", () => {
    expect(areHeroSlidesEquivalent(undefined, undefined)).toBe(true);
  });

  it("same reference → equivalent", () => {
    const arr: HeroSlide[] = [slide({ id: "a" })];
    expect(areHeroSlidesEquivalent(arr, arr)).toBe(true);
  });

  it("one undefined → not equivalent", () => {
    expect(areHeroSlidesEquivalent([slide({ id: "a" })], undefined)).toBe(false);
    expect(areHeroSlidesEquivalent(undefined, [slide({ id: "a" })])).toBe(false);
  });

  it("empty arrays → equivalent", () => {
    expect(areHeroSlidesEquivalent([], [])).toBe(true);
  });

  it("same all fields → equivalent", () => {
    const mk = (): HeroSlide => slide({
      id: "1", title: "Hero", subtitle: "sub", content: "body", link: "/x",
      className: "from-red-500", background: "default", overlayOpacity: 40,
      image: { url: "https://example.com/img.jpg", alt: "alt", backgroundMode: "blur-fill",
        crop: { cx: 0.5, cy: 0.5, zoom: 1 },
        mobileCrop: { cx: 0.4, cy: 0.6, zoom: 1.1 },
        desktopCrop: { cx: 0.3, cy: 0.7, zoom: 1.2 },
        ultraWideCrop: { cx: 0.2, cy: 0.8, zoom: 1.3 },
      },
    });
    expect(areHeroSlidesEquivalent([mk()], [mk()])).toBe(true);
  });

  it("different length → not equivalent", () => {
    expect(areHeroSlidesEquivalent([slide({ id: "1" })], [])).toBe(false);
  });

  it("different id → not equivalent", () => {
    expect(areHeroSlidesEquivalent([slide({ id: "1" })], [slide({ id: "2" })])).toBe(false);
  });

  it("different title → not equivalent", () => {
    expect(areHeroSlidesEquivalent([slide({ id: "1", title: "Old" })], [slide({ id: "1", title: "New" })])).toBe(false);
  });

  it("different subtitle → not equivalent", () => {
    const a = [slide({ id: "1", subtitle: "A" })];
    const b = [slide({ id: "1", subtitle: "B" })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different link → not equivalent", () => {
    const a = [slide({ id: "1", link: "/a" })];
    const b = [slide({ id: "1", link: "/b" })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different image url → not equivalent", () => {
    const a = [slide({ id: "1", image: { url: "https://example.com/a.jpg" } })];
    const b = [slide({ id: "1", image: { url: "https://example.com/b.jpg" } })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different image backgroundMode → not equivalent", () => {
    const a = [slide({ id: "1", image: { url: "https://example.com/x.jpg", backgroundMode: "cover" } })];
    const b = [slide({ id: "1", image: { url: "https://example.com/x.jpg", backgroundMode: "blur-fill" } })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different crop cx → not equivalent", () => {
    const a = [slide({ id: "1", image: { url: "u", crop: { cx: 0.5, cy: 0.5, zoom: 1 } } })];
    const b = [slide({ id: "1", image: { url: "u", crop: { cx: 0.3, cy: 0.5, zoom: 1 } } })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different mobileCrop → not equivalent", () => {
    const a = [slide({ id: "1", image: { url: "u", mobileCrop: { cx: 0.5, cy: 0.5, zoom: 1 } } })];
    const b = [slide({ id: "1", image: { url: "u", mobileCrop: { cx: 0.1, cy: 0.5, zoom: 1 } } })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different desktopCrop → not equivalent", () => {
    const a = [slide({ id: "1", image: { url: "u", desktopCrop: { cx: 0.5, cy: 0.5, zoom: 1 } } })];
    const b = [slide({ id: "1", image: { url: "u", desktopCrop: { cx: 0.9, cy: 0.5, zoom: 1 } } })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different ultraWideCrop → not equivalent", () => {
    const a = [slide({ id: "1", image: { url: "u", ultraWideCrop: { cx: 0.5, cy: 0.5, zoom: 1 } } })];
    const b = [slide({ id: "1", image: { url: "u", ultraWideCrop: { cx: 0.5, cy: 0.9, zoom: 1 } } })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different overlayOpacity → not equivalent", () => {
    const a = [slide({ id: "1", overlayOpacity: 0 })];
    const b = [slide({ id: "1", overlayOpacity: 50 })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different className → not equivalent", () => {
    const a = [slide({ id: "1", className: "from-red-500" })];
    const b = [slide({ id: "1", className: "from-blue-500" })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("different background policy → not equivalent", () => {
    const a = [slide({ id: "1", background: "default" })];
    const b = [slide({ id: "1", background: "none" })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  // legacy imageUrl fallback
  it("different legacy imageUrl → not equivalent", () => {
    const a = [slide({ id: "1", imageUrl: "https://example.com/a.jpg" })];
    const b = [slide({ id: "1", imageUrl: "https://example.com/b.jpg" })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });

  it("image url added over legacy imageUrl → not equivalent", () => {
    const a = [slide({ id: "1", imageUrl: "https://example.com/old.jpg" })];
    const b = [slide({ id: "1", imageUrl: "https://example.com/old.jpg", image: { url: "https://example.com/new.jpg" } })];
    expect(areHeroSlidesEquivalent(a, b)).toBe(false);
  });
});
