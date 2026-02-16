import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ScriptSurface from "./ScriptSurface";

vi.mock("../renderer/ScriptViewer", () => ({
  default: ({ text }) => <div data-testid="script-viewer">{text}</div>
}));

describe("ScriptSurface", () => {
  it("renders empty message when text is empty", () => {
    render(
      <ScriptSurface
        show
        readOnly
        outerClassName="outer"
        scrollClassName="scroll-target"
        text=""
        emptyMessage="空白提示"
      />
    );

    expect(screen.getByText("空白提示")).toBeInTheDocument();
  });

  it("triggers onDoubleClick on desktop double click", () => {
    const onDoubleClick = vi.fn();
    const { container } = render(
      <ScriptSurface
        show
        readOnly
        outerClassName="outer"
        scrollClassName="scroll-target"
        text="INT. ROOM - DAY"
        onDoubleClick={onDoubleClick}
      />
    );

    const scrollArea = container.querySelector(".scroll-target");
    fireEvent.doubleClick(scrollArea);
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
  });

  it("triggers onDoubleClick on mobile double tap", () => {
    const onDoubleClick = vi.fn();
    const { container } = render(
      <ScriptSurface
        show
        readOnly
        outerClassName="outer"
        scrollClassName="scroll-target"
        text="INT. ROOM - DAY"
        onDoubleClick={onDoubleClick}
      />
    );

    const scrollArea = container.querySelector(".scroll-target");

    fireEvent.touchStart(scrollArea, { touches: [{ clientX: 20, clientY: 20 }] });
    fireEvent.touchEnd(scrollArea, { changedTouches: [{ clientX: 20, clientY: 20 }] });
    fireEvent.touchStart(scrollArea, { touches: [{ clientX: 22, clientY: 21 }] });
    fireEvent.touchEnd(scrollArea, { changedTouches: [{ clientX: 22, clientY: 21 }] });

    expect(onDoubleClick).toHaveBeenCalledTimes(1);
  });
});
