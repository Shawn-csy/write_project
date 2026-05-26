import { describe, expect, it } from "vitest";
import { evaluateMarkerSampleMatch } from "./StepSymbolConfig";

describe("evaluateMarkerSampleMatch", () => {
  it("matches prefix marker from sample lines", () => {
    const result = evaluateMarkerSampleMatch({
      markerType: "single",
      config: { matchMode: "prefix", start: "#SE" },
      sampleText: "INT. ROOM\n#SE Door slam",
    });
    expect(result.matched).toBe(true);
  });

  it("fails when enclosure marker has no closing symbol", () => {
    const result = evaluateMarkerSampleMatch({
      markerType: "inline",
      config: { matchMode: "enclosure", start: "(", end: ")" },
      sampleText: "角色名 (V.O.",
    });
    expect(result.matched).toBe(false);
  });

  it("matches range marker with start/end pair", () => {
    const result = evaluateMarkerSampleMatch({
      markerType: "range",
      config: { matchMode: "range", start: ">>SE", end: "<<SE" },
      sampleText: ">>SE\n風聲\n<<SE",
    });
    expect(result.matched).toBe(true);
  });
});

