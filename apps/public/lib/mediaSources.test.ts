import { describe, expect, it } from "vitest";
import { rewriteMediaUrls, toFallbackMediaUrl } from "./mediaSources";

const origins = { primary: "https://tunnel.example", fallback: "https://r2.example" };

describe("rewriteMediaUrls", () => {
  const payload = { cover: "/media/u/a.webp", nested: [{ avatar: "/media/u/b.jpg" }], title: "/not-media", text: "see /media/x" };

  it("points /media/ strings at the primary origin", () => {
    expect(rewriteMediaUrls(payload, origins, "primary")).toEqual({
      cover: "https://tunnel.example/media/u/a.webp",
      nested: [{ avatar: "https://tunnel.example/media/u/b.jpg" }],
      title: "/not-media",
      text: "see /media/x",
    });
  });

  it("points at R2 for data served by the fallback API", () => {
    expect(rewriteMediaUrls(payload, origins, "fallback").cover).toBe("https://r2.example/media/u/a.webp");
  });

  it("keeps the primary origin when no R2 origin is configured", () => {
    expect(rewriteMediaUrls(payload, { ...origins, fallback: "" }, "fallback").cover).toBe("https://tunnel.example/media/u/a.webp");
  });
});

describe("toFallbackMediaUrl", () => {
  it("maps a primary media URL to the same key on R2", () => {
    expect(toFallbackMediaUrl("https://tunnel.example/media/u/a.webp?v=1", origins)).toBe("https://r2.example/media/u/a.webp?v=1");
  });

  it("ignores other images and a missing fallback", () => {
    expect(toFallbackMediaUrl("https://elsewhere.example/media/a.webp", origins)).toBeNull();
    expect(toFallbackMediaUrl("https://tunnel.example/media/a.webp", { ...origins, fallback: "" })).toBeNull();
  });
});
