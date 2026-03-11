import { describe, expect, it } from "vitest";
import {
  parseTagCandidates,
  sanitizeCustomJsonFields,
  resolveTagSourceFromParsedJson,
} from "./useScriptMetadataJson";

describe("useScriptMetadataJson helpers", () => {
  it("resolves legacy tags source from custom fields object", () => {
    const parsed = { custom: { Tags: "懸疑, 戀愛" } };
    expect(resolveTagSourceFromParsedJson(parsed)).toBe("懸疑, 戀愛");
  });

  it("removes tag-like keys from custom json fields", () => {
    const input = { Tags: "A,B", Notes: "hello" };
    expect(sanitizeCustomJsonFields(input)).toEqual({ Notes: "hello" });
  });

  it("parses tag candidates from csv text", () => {
    expect(parseTagCandidates("A, B，C")).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
  });
});
