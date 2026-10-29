import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePublisherWorksTabState } from "./usePublisherWorksTabState";

describe("Studio readiness projection", () => {
  it("keeps paginated badges aligned with server filters and counts", () => {
    const input = {
      isLoading: false, externalPagination: true,
      serverCounts: { all: 57, needs_work: 50, ready: 1, published: 6 },
      scripts: [{ id: "legacy", title: "Legacy classification", publishReadiness: "ready" as const }],
    };
    const { result } = renderHook(() => usePublisherWorksTabState(input));
    expect(result.current.readinessById.legacy.status).toBe("ready");
    expect(result.current.filteredStatusCounts.all).toBe(57);
    expect(result.current.visibleScripts).toHaveLength(1);
  });

  it("recognizes canonical classification without requiring duplicate tags", () => {
    const input = {
      isLoading: false,
      scripts: [{ id: "canonical", title: "Ready", personaId: "p1",
        targetAudience: "全性向", contentRating: "全年齡向",
        licenseCommercial: "allow", licenseDerivative: "allow", licenseNotify: "required" }],
    };
    const { result } = renderHook(() => usePublisherWorksTabState(input));
    expect(result.current.readinessById.canonical.status).toBe("ready");
    expect(result.current.readinessById.canonical.missingRequired).toEqual([]);
  });
});
