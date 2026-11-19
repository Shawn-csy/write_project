import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { buildPublishChecklist } from "./usePublishChecklist";
import { useScriptMetadataChecklistUI } from "./useScriptMetadataChecklistUI";

const base = {
  title: "T", identity: "persona:p1", licenseCommercial: "a", licenseDerivative: "a", licenseNotify: "a",
  coverUrl: "", synopsis: "", tags: [] as unknown[], targetAudience: "x", contentRating: "y",
};

const run = (overrides: Partial<typeof base>) => {
  const publishChecklist = buildPublishChecklist({ ...base, ...overrides });
  return renderHook(() =>
    useScriptMetadataChecklistUI({ publishChecklist, showValidationHints: false, showAllChecklistChips: false, status: "Private" })
  ).result.current;
};

describe("useScriptMetadataChecklistUI progress", () => {
  it("counts only required items so completed required data reads 5/5, not 5/8", () => {
    const r = run({});
    expect(r.completedChecklistItems).toBe(5);
    expect(r.totalChecklistItems).toBe(5);
    expect(r.completionPercent).toBe(100);
    expect(r.completedRecommendedItems).toBe(0);
    expect(r.totalRecommendedItems).toBe(3);
  });

  it("does not let recommended items inflate required progress", () => {
    const r = run({ title: "", coverUrl: "c", synopsis: "s", tags: [1] });
    expect(r.completedChecklistItems).toBe(4);
    expect(r.totalChecklistItems).toBe(5);
    expect(r.completionPercent).toBe(80);
    expect(r.completedRecommendedItems).toBe(3);
  });
});
