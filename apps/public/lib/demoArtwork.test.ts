import { describe, expect, it } from "vitest";
import { demoArtwork } from "./demoArtwork";

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
