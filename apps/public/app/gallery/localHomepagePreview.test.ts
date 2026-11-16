import { describe, expect, it } from "vitest";
import { withLocalHomepagePreview } from "./localHomepagePreview";

describe("local development homepage banner", () => {
  const slides = [{ id: "brand-intro", title: "Brand" }, { id: "ad", imageUrl: "/media/ad.webp" }];
  it("adds the approved audio discovery copy third only when explicitly enabled", () => {
    expect(withLocalHomepagePreview(slides, false)).toBe(slides);
    expect(withLocalHomepagePreview(slides, true)[2]).toMatchObject({ title: "探索音聲作品", link: "/audio-works" });
    expect(slides).toHaveLength(2);
  });
  it("does not duplicate a local fixture or an existing audio discovery banner", () => {
    const preview = withLocalHomepagePreview(slides, true);
    expect(withLocalHomepagePreview(preview, true)).toBe(preview);
    const existing = [...slides, { id: "published", link: "/audio-works" }];
    expect(withLocalHomepagePreview(existing, true)).toBe(existing);
  });
});
