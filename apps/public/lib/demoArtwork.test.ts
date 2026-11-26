import { describe, expect, it } from "vitest";
import { demoArtwork, demoArtworkSources } from "./demoArtwork";

describe("demoArtwork", () => {
  const demoCover = "https://example.com/performer-cover.jpg";
  const scriptCover = "https://example.com/script-cover.jpg";

  it("uses the supplied performance cover on both X and YouTube", () => {
    expect(demoArtwork("https://x.com/actor/status/123", demoCover, scriptCover)).toBe(demoCover);
    expect(demoArtwork("https://youtu.be/sample", demoCover, scriptCover)).toBe(demoCover);
  });

  it("falls back to a YouTube thumbnail or the script cover", () => {
    expect(demoArtwork("https://youtu.be/sample", "", scriptCover)).toBe("https://img.youtube.com/vi/sample/hqdefault.jpg");
    expect(demoArtwork("https://x.com/actor/status/123", "", scriptCover)).toBe(scriptCover);
  });
});

it("keeps expiring Meta media out of share metadata", () => {
  const temporary = "https://instagram.example.fna.fbcdn.net/cover.jpg?oe=6AF86B4B";
  expect(demoArtwork("https://youtu.be/sample", temporary)).toBe("https://img.youtube.com/vi/sample/hqdefault.jpg");
  expect(demoArtwork("https://example.com/demo", temporary)).toBe("");
  expect(demoArtwork("https://youtu.be/sample", "https://example.com/cover.jpg")).toBe("https://example.com/cover.jpg");
});

it("orders distinct backup sources after the preferred performance image", () => {
  const thumbnail = "https://img.youtube.com/vi/sample/hqdefault.jpg";
  expect(demoArtworkSources("https://youtu.be/sample", thumbnail, "https://example.com/script.jpg"))
    .toEqual([thumbnail, "https://example.com/script.jpg"]);
});
