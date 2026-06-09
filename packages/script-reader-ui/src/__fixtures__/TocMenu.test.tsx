/**
 * TocMenu tests.
 *
 * Covers:
 *   1. Trigger rendering — count label, empty case
 *   2. Interaction — open panel, item links visible, clicking item closes panel
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { TocMenu } from "../TocMenu";
import { useTocState } from "../useTocState";

const TOC = [
  { id: "scene-1", label: "Scene 1" },
  { id: "scene-2", label: "Scene 2" },
];

function Fixture({ toc = TOC }: { toc?: typeof TOC }) {
  const tocState = useTocState();
  return <TocMenu toc={toc} tocState={tocState} />;
}

// ---------------------------------------------------------------------------
// Trigger rendering
// ---------------------------------------------------------------------------

describe("TocMenu — trigger rendering", () => {
  it("renders trigger with count label", () => {
    render(<Fixture />);
    expect(screen.queryByText("目錄 (2)")).not.toBeNull();
  });

  it("renders nothing when toc is empty", () => {
    const { container } = render(<Fixture toc={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("panel is not visible initially", () => {
    render(<Fixture />);
    expect(screen.queryByText("Scene 1")).toBeNull();
    expect(screen.queryByText("Scene 2")).toBeNull();
  });

  it("aria-expanded is false initially", () => {
    render(<Fixture />);
    const btn = screen.getByText("目錄 (2)");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

describe("TocMenu — interaction", () => {
  it("opens panel and shows TOC items on trigger click", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => { await user.click(screen.getByText("目錄 (2)")); });
    expect(screen.queryByText("Scene 1")).not.toBeNull();
    expect(screen.queryByText("Scene 2")).not.toBeNull();
  });

  it("aria-expanded becomes true when open", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => { await user.click(screen.getByText("目錄 (2)")); });
    expect(screen.getByText("目錄 (2)").getAttribute("aria-expanded")).toBe("true");
  });

  it("clicking TOC item closes the panel", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => { await user.click(screen.getByText("目錄 (2)")); });
    expect(screen.queryByText("Scene 1")).not.toBeNull();
    await act(async () => { await user.click(screen.getByText("Scene 1")); });
    expect(screen.queryByText("Scene 1")).toBeNull();
  });

  it("toggle closes open panel", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await act(async () => { await user.click(screen.getByText("目錄 (2)")); });
    expect(screen.queryByText("Scene 1")).not.toBeNull();
    await act(async () => { await user.click(screen.getByText("目錄 (2)")); });
    expect(screen.queryByText("Scene 1")).toBeNull();
  });

  it("calls onItemClick when item is clicked", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    function FixtureWithCallback() {
      const tocState = useTocState();
      return <TocMenu toc={TOC} tocState={tocState} onItemClick={onItemClick} />;
    }
    render(<FixtureWithCallback />);
    // open panel
    await act(async () => { await user.click(screen.getByText("目錄 (2)")); });
    expect(screen.queryByText("Scene 2")).not.toBeNull();
    await act(async () => { await user.click(screen.getByText("Scene 2")); });
    expect(onItemClick).toHaveBeenCalledWith(TOC[1]);
  });

  it("accepts custom renderItem render prop", async () => {
    const user = userEvent.setup();
    function FixtureWithRenderItem() {
      const tocState = useTocState();
      return (
        <TocMenu
          toc={TOC}
          tocState={tocState}
          renderItem={(entry, close) => (
            <button data-testid={`item-${entry.id}`} onClick={close}>
              {entry.label}
            </button>
          )}
        />
      );
    }
    render(<FixtureWithRenderItem />);
    await act(async () => { await user.click(screen.getByText("目錄 (2)")); });
    expect(screen.getByTestId("item-scene-1")).not.toBeNull();
    await act(async () => { await user.click(screen.getByTestId("item-scene-1")); });
    expect(screen.queryByTestId("item-scene-1")).toBeNull();
  });
});
