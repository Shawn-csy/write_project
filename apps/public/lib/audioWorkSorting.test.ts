import { describe, expect, it } from "vitest";
import { sortAudioWorks } from "./audioWorkSorting";
import type { PublicAudioWork } from "./types";

describe("sortAudioWorks", () => {
  it("sorts by release time and keeps unknown release dates after known dates", () => {
    const works: PublicAudioWork[] = [
      { id: "a", title: "A", url: "https://example.com/a", accessType: "free", createdAt: 500, publishedAt: 100 },
      { id: "b", title: "B", url: "https://example.com/b", accessType: "paid", createdAt: 300 },
      { id: "c", title: "C", url: "https://example.com/c", accessType: "paid", createdAt: 200, publishedAt: 400 },
    ];
    expect(sortAudioWorks(works, "newest").map((work) => work.id)).toEqual(["c", "a", "b"]);
    expect(sortAudioWorks(works, "oldest").map((work) => work.id)).toEqual(["a", "c", "b"]);
    expect(works.map((work) => work.id)).toEqual(["a", "b", "c"]);
  });
});
