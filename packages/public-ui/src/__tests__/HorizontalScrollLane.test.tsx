import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HorizontalScrollLane } from "../HorizontalScrollLane";

const cards = Array.from({ length: 20 }, (_, index) => <div key={index} data-card>{index + 1}</div>);

describe("HorizontalScrollLane progressive cards", () => {
  it("renders the same first batch on server and client", () => {
    const markup = renderToString(<HorizontalScrollLane initialItemCount={8}>{cards}</HorizontalScrollLane>);
    expect(markup.match(/data-card/g)).toHaveLength(8);
    const { container } = render(<HorizontalScrollLane initialItemCount={8}>{cards}</HorizontalScrollLane>);
    expect(container.querySelectorAll("[data-card]")).toHaveLength(8);
  });

  it("adds cards only when the reader reaches the lane end", () => {
    const { container } = render(<HorizontalScrollLane initialItemCount={8} itemBatchSize={8}>{cards}</HorizontalScrollLane>);
    const lane = container.querySelector("[class*='overflow-x-auto']") as HTMLElement;
    Object.defineProperties(lane, {
      clientWidth: { configurable: true, value: 1000 },
      scrollWidth: { configurable: true, value: 2200 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });
    fireEvent.scroll(lane);
    expect(container.querySelectorAll("[data-card]")).toHaveLength(8);
    lane.scrollLeft = 900;
    fireEvent.scroll(lane);
    expect(container.querySelectorAll("[data-card]")).toHaveLength(16);
    lane.scrollLeft = 1200;
    fireEvent.scroll(lane);
    expect(container.querySelectorAll("[data-card]")).toHaveLength(20);
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
