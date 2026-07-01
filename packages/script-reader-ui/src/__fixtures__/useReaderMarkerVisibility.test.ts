import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReaderMarkerVisibility } from "../useReaderMarkerVisibility";

const CONFIGS = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
];

describe("useReaderMarkerVisibility", () => {
  it("starts with all markers visible", () => {
    const { result } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    expect(result.current.hiddenMarkerIds).toEqual([]);
    expect(result.current.visibleCount).toBe(3);
    expect(result.current.totalCount).toBe(3);
  });

  it("toggleMarker hides a visible marker", () => {
    const { result } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    act(() => { result.current.toggleMarker("alpha"); });
    expect(result.current.hiddenMarkerIds).toContain("alpha");
    expect(result.current.visibleCount).toBe(2);
    expect(result.current.isHidden("alpha")).toBe(true);
    expect(result.current.isHidden("beta")).toBe(false);
  });

  it("toggleMarker restores a hidden marker", () => {
    const { result } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    act(() => { result.current.toggleMarker("alpha"); });
    act(() => { result.current.toggleMarker("alpha"); });
    expect(result.current.hiddenMarkerIds).not.toContain("alpha");
    expect(result.current.visibleCount).toBe(3);
  });

  it("hideAll hides all markers", () => {
    const { result } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    act(() => { result.current.hideAll(); });
    expect(result.current.hiddenMarkerIds).toHaveLength(3);
    expect(result.current.visibleCount).toBe(0);
  });

  it("showAll restores all markers after hideAll", () => {
    const { result } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    act(() => { result.current.hideAll(); });
    act(() => { result.current.showAll(); });
    expect(result.current.hiddenMarkerIds).toHaveLength(0);
    expect(result.current.visibleCount).toBe(3);
  });

  it("independent toggles do not interfere", () => {
    const { result } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    act(() => { result.current.toggleMarker("alpha"); });
    act(() => { result.current.toggleMarker("gamma"); });
    expect(result.current.hiddenMarkerIds).toContain("alpha");
    expect(result.current.hiddenMarkerIds).toContain("gamma");
    expect(result.current.hiddenMarkerIds).not.toContain("beta");
    expect(result.current.visibleCount).toBe(1);
  });

  it("empty config: visibleCount and totalCount are 0", () => {
    const { result } = renderHook(() => useReaderMarkerVisibility([]));
    expect(result.current.visibleCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hiddenMarkerIds).toHaveLength(0);
  });

  it("prunes hidden ids when markerConfigs shrinks", () => {
    const { result, rerender } = renderHook(
      ({ configs }: { configs: typeof CONFIGS }) => useReaderMarkerVisibility(configs),
      { initialProps: { configs: CONFIGS } }
    );
    act(() => { result.current.toggleMarker("alpha"); });
    expect(result.current.isHidden("alpha")).toBe(true);
    // Remove "alpha" from configs
    rerender({ configs: [{ id: "beta", label: "Beta" }, { id: "gamma", label: "Gamma" }] });
    expect(result.current.hiddenMarkerIds).not.toContain("alpha");
    expect(result.current.visibleCount).toBe(2);
  });

  it("stable callback references across re-renders", () => {
    const { result, rerender } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    const { toggleMarker, showAll, hideAll, isHidden } = result.current;
    rerender();
    expect(result.current.toggleMarker).toBe(toggleMarker);
    expect(result.current.showAll).toBe(showAll);
    expect(result.current.hideAll).toBe(hideAll);
    expect(result.current.isHidden).toBe(isHidden);
  });
});
