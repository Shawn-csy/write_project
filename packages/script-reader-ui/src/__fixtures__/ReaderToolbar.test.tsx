/**
 * ReaderToolbar shared component tests.
 *
 * Covers:
 *   - renders MarkerVisibilityMenu trigger when marker configs present
 *   - renders TocMenu trigger when toc present
 *   - renders startSlot and endSlot
 *   - renders nothing for markers/toc when empty
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { ReaderToolbar } from "../ReaderToolbar";
import { useReaderMarkerVisibility } from "../useReaderMarkerVisibility";
import { useTocState } from "../useTocState";

const MARKER_CONFIGS = [
  { id: "alpha", label: "Alpha Marker" },
  { id: "beta", label: "Beta Marker" },
];

const TOC = [
  { id: "scene-1", label: "Scene 1" },
];

function Fixture({
  markerConfigs = MARKER_CONFIGS,
  toc = TOC,
}: {
  markerConfigs?: typeof MARKER_CONFIGS;
  toc?: typeof TOC;
}) {
  const markerVisibility = useReaderMarkerVisibility(markerConfigs);
  const tocState = useTocState();
  return (
    <ReaderToolbar
      markerConfigs={markerConfigs}
      markerVisibility={markerVisibility}
      toc={toc}
      tocState={tocState}
    />
  );
}

describe("ReaderToolbar — rendering", () => {
  it("renders marker trigger", () => {
    render(<Fixture />);
    expect(screen.queryByText("標記 (2/2)")).not.toBeNull();
  });

  it("renders toc trigger", () => {
    render(<Fixture />);
    expect(screen.queryByText("目錄 (1)")).not.toBeNull();
  });

  it("no marker trigger when markerConfigs empty", () => {
    render(<Fixture markerConfigs={[]} />);
    expect(screen.queryByText(/標記 \(/)).toBeNull();
  });

  it("no toc trigger when toc empty", () => {
    render(<Fixture toc={[]} />);
    expect(screen.queryByText(/目錄 \(/)).toBeNull();
  });

  it("renders startSlot", () => {
    const markerVisibility = renderHook(() => useReaderMarkerVisibility([])).result.current;
    const tocState = renderHook(() => useTocState()).result.current;
    render(
      <ReaderToolbar
        markerConfigs={[]}
        markerVisibility={markerVisibility}
        toc={[]}
        tocState={tocState}
        startSlot={<span data-testid="start">back</span>}
      />
    );
    expect(screen.getByTestId("start")).not.toBeNull();
  });

  it("renders endSlot", () => {
    const markerVisibility = renderHook(() => useReaderMarkerVisibility([])).result.current;
    const tocState = renderHook(() => useTocState()).result.current;
    render(
      <ReaderToolbar
        markerConfigs={[]}
        markerVisibility={markerVisibility}
        toc={[]}
        tocState={tocState}
        endSlot={<span data-testid="end">extra</span>}
      />
    );
    expect(screen.getByTestId("end")).not.toBeNull();
  });
});
