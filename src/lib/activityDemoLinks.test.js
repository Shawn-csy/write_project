import { describe, expect, it } from "vitest";
import {
  normalizeActivityDemoLinks,
  parseActivityDemoLinks,
  serializeActivityDemoLinks,
} from "./activityDemoLinks";

describe("activityDemoLinks", () => {
  it("parses structured links from json string", () => {
    const raw = JSON.stringify([
      { name: "第一集", url: "https://example.com/1", cast: "A", description: "desc" },
    ]);
    const parsed = parseActivityDemoLinks(raw);
    expect(parsed).toEqual([
      {
        id: "demo-1",
        name: "第一集",
        url: "https://example.com/1",
        cast: "A",
        description: "desc",
      },
    ]);
  });

  it("keeps backward compatibility for legacy url string", () => {
    const parsed = parseActivityDemoLinks("https://example.com/demo");
    expect(parsed[0]).toMatchObject({
      name: "",
      url: "https://example.com/demo",
      cast: "",
      description: "",
    });
  });

  it("serializes links without transient id field", () => {
    const raw = normalizeActivityDemoLinks([
      { id: "x1", name: "試聽A", url: "https://example.com/a", cast: "配音A", description: "說明A" },
    ]);
    expect(serializeActivityDemoLinks(raw)).toBe(
      JSON.stringify([{ name: "試聽A", url: "https://example.com/a", cast: "配音A", description: "說明A" }])
    );
  });
});
