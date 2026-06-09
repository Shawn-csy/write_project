/**
 * MarkerVisibilityMenu tests.
 *
 * Two layers:
 *   1. Trigger rendering — count label, render prop, empty case (no userEvent needed)
 *   2. Interaction — open dropdown, click items, verify count + toggle (uses userEvent)
 *
 * Hook state logic (toggle/hide/show/count) is covered by
 * useReaderMarkerVisibility.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { MarkerVisibilityMenu } from "../MarkerVisibilityMenu";
import { useReaderMarkerVisibility } from "../useReaderMarkerVisibility";

const CONFIGS = [
  { id: "alpha", label: "Alpha Marker" },
  { id: "beta", label: "Beta Marker" },
];

function makeVisibility(configs = CONFIGS) {
  return renderHook(() => useReaderMarkerVisibility(configs)).result.current;
}

function Fixture({ configs = CONFIGS }: { configs?: typeof CONFIGS }) {
  const visibility = useReaderMarkerVisibility(configs);
  return <MarkerVisibilityMenu markerConfigs={configs} visibility={visibility} />;
}

// ---------------------------------------------------------------------------
// Trigger rendering
// ---------------------------------------------------------------------------

describe("MarkerVisibilityMenu — trigger rendering", () => {
  it("renders trigger with correct initial count label (2/2)", () => {
    const visibility = makeVisibility();
    render(<MarkerVisibilityMenu markerConfigs={CONFIGS} visibility={visibility} />);
    expect(screen.queryByText("標記 (2/2)")).not.toBeNull();
  });

  it("renders nothing when markerConfigs is empty", () => {
    const visibility = makeVisibility([]);
    const { container } = render(
      <MarkerVisibilityMenu markerConfigs={[]} visibility={visibility} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("trigger label reflects updated count when visibility changes", () => {
    const { result, rerender } = renderHook(() => useReaderMarkerVisibility(CONFIGS));
    const { rerender: rerenderMenu } = render(
      <MarkerVisibilityMenu markerConfigs={CONFIGS} visibility={result.current} />
    );
    expect(screen.queryByText("標記 (2/2)")).not.toBeNull();

    const { act } = require("@testing-library/react");
    act(() => { result.current.hideAll(); });
    rerenderMenu(
      <MarkerVisibilityMenu markerConfigs={CONFIGS} visibility={result.current} />
    );
    expect(screen.queryByText("標記 (0/2)")).not.toBeNull();
  });

  it("accepts custom trigger render prop, renders with count label", () => {
    const visibility = makeVisibility();
    render(
      <MarkerVisibilityMenu
        markerConfigs={CONFIGS}
        visibility={visibility}
        trigger={(label) => (
          <button type="button" data-testid="custom-trigger">{label}</button>
        )}
      />
    );
    const btn = screen.getByTestId("custom-trigger");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("標記 (2/2)");
  });

  it("default trigger has title attribute", () => {
    const visibility = makeVisibility();
    render(<MarkerVisibilityMenu markerConfigs={CONFIGS} visibility={visibility} />);
    const btn = screen.getByText("標記 (2/2)");
    expect(btn.getAttribute("title")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Interaction (Radix portal — requires userEvent pointer events)
// ---------------------------------------------------------------------------

describe("MarkerVisibilityMenu — interaction", () => {
  it("opens dropdown and shows marker labels", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => {
      await user.click(screen.getByText("標記 (2/2)"));
    });
    await waitFor(() => {
      expect(screen.queryByText("Alpha Marker")).not.toBeNull();
      expect(screen.queryByText("Beta Marker")).not.toBeNull();
    });
  });

  it("count label updates to (1/2) after clicking a marker item", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => {
      await user.click(screen.getByText("標記 (2/2)"));
    });
    await waitFor(() => expect(screen.queryByText("Alpha Marker")).not.toBeNull());
    await act(async () => {
      await user.click(screen.getByText("Alpha Marker"));
    });
    await waitFor(() => expect(screen.queryByText("標記 (1/2)")).not.toBeNull());
  });

  it("count label restores to (2/2) after toggling same marker again", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => {
      await user.click(screen.getByText("標記 (2/2)"));
    });
    await waitFor(() => expect(screen.queryByText("Alpha Marker")).not.toBeNull());
    await act(async () => {
      await user.click(screen.getByText("Alpha Marker"));
    });
    await waitFor(() => expect(screen.queryByText("標記 (1/2)")).not.toBeNull());
    await act(async () => {
      await user.click(screen.getByText("Alpha Marker"));
    });
    await waitFor(() => expect(screen.queryByText("標記 (2/2)")).not.toBeNull());
  });

  it("toggling alpha does not affect beta", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => {
      await user.click(screen.getByText("標記 (2/2)"));
    });
    await waitFor(() => expect(screen.queryByText("Alpha Marker")).not.toBeNull());
    await act(async () => {
      await user.click(screen.getByText("Alpha Marker"));
    });
    await waitFor(() => {
      expect(screen.queryByText("標記 (1/2)")).not.toBeNull();
      expect(screen.queryByText("Beta Marker")).not.toBeNull();
    });
  });
});
