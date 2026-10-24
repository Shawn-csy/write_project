import { describe, it, expect } from "vitest";
import {
  PUBLIC_MEDIA_WIDTHS,
  buildMediaSrcSet,
  parseMediaWidth,
  stripMediaExtension,
  withMediaExtension,
} from "../publicMediaUrl";

describe("withMediaExtension / stripMediaExtension", () => {
  it("appends .webp to proxy paths once", () => {
    expect(withMediaExtension("/api/public-media/abc")).toBe("/api/public-media/abc.webp");
    expect(withMediaExtension("/api/public-media/abc.webp")).toBe("/api/public-media/abc.webp");
    expect(withMediaExtension("/api/public-media/external/id-1")).toBe("/api/public-media/external/id-1.webp");
  });

  it("keeps the query string after the extension", () => {
    expect(withMediaExtension("/api/public-media/abc?w=240")).toBe("/api/public-media/abc.webp?w=240");
  });

  it("leaves non-proxy sources untouched", () => {
    expect(withMediaExtension("/media/a/b.jpg")).toBe("/media/a/b.jpg");
    expect(withMediaExtension("https://example.com/x.png")).toBe("https://example.com/x.png");
  });

  it("strips only a trailing .webp", () => {
    expect(stripMediaExtension("abc.webp")).toBe("abc");
    expect(stripMediaExtension("abc")).toBe("abc");
    expect(stripMediaExtension("a.webp.b")).toBe("a.webp.b");
  });
});

describe("buildMediaSrcSet", () => {
  it("lists every allowed width for a proxy path", () => {
    const srcSet = buildMediaSrcSet("/api/public-media/abc");
    for (const width of PUBLIC_MEDIA_WIDTHS) {
      expect(srcSet).toContain(`/api/public-media/abc.webp?w=${width} ${width}w`);
    }
  });

  it("returns an empty string for other sources or already-sized URLs", () => {
    expect(buildMediaSrcSet("/media/a.jpg")).toBe("");
    expect(buildMediaSrcSet("/api/public-media/abc?w=240")).toBe("");
  });
});

describe("parseMediaWidth", () => {
  it("snaps to the smallest allowed width that covers the request", () => {
    expect(parseMediaWidth("100")).toBe(240);
    expect(parseMediaWidth("240")).toBe(240);
    expect(parseMediaWidth("241")).toBe(360);
  });

  it("clamps to the largest allowed width", () => {
    expect(parseMediaWidth("99999")).toBe(PUBLIC_MEDIA_WIDTHS[PUBLIC_MEDIA_WIDTHS.length - 1]);
  });

  it("ignores missing or invalid values", () => {
    expect(parseMediaWidth(null)).toBeNull();
    expect(parseMediaWidth("")).toBeNull();
    expect(parseMediaWidth("abc")).toBeNull();
    expect(parseMediaWidth("-5")).toBeNull();
  });
});
