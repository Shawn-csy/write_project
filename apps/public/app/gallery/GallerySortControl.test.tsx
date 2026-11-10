import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GallerySortControl } from "./GallerySortControl";

describe("GallerySortControl", () => {
  it("renders latest / top / random options", () => {
    render(<GallerySortControl value={null} onChange={() => {}} />);
    for (const label of ["最新", "熱門", "隨機"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("shows 總覽 as an explicit lanes option when showOverview is set", () => {
    const onChange = vi.fn();
    const { rerender } = render(<GallerySortControl value={null} onChange={onChange} showOverview />);
    expect(screen.getByRole("button", { name: "總覽" }).getAttribute("aria-pressed")).toBe("true");

    rerender(<GallerySortControl value="latest" onChange={onChange} showOverview />);
    expect(screen.getByRole("button", { name: "總覽" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "總覽" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("selects an option and toggles back to lanes when clicking the active one", () => {
    const onChange = vi.fn();
    const { rerender } = render(<GallerySortControl value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "熱門" }));
    expect(onChange).toHaveBeenLastCalledWith("top");

    rerender(<GallerySortControl value="top" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "熱門" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "熱門" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
