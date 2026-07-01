import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GallerySegmentBar } from "./GallerySegmentBar";

describe("GallerySegmentBar", () => {
  it("renders all segment tabs", () => {
    render(<GallerySegmentBar segment="all" onSegmentChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "全部" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "全年齡向" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "成人向" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "男性向" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "女性向" })).toBeTruthy();
  });

  it("active segment button has active styles", () => {
    render(<GallerySegmentBar segment="adult" onSegmentChange={vi.fn()} />);
    const adultBtn = screen.getByRole("button", { name: "成人向" });
    expect(adultBtn.className).toContain("font-semibold");
    const allBtn = screen.getByRole("button", { name: "全部" });
    expect(allBtn.className).not.toContain("font-semibold");
  });

  it("calls onSegmentChange with correct value when clicking 成人向", () => {
    const onSegmentChange = vi.fn();
    render(<GallerySegmentBar segment="all" onSegmentChange={onSegmentChange} />);
    fireEvent.click(screen.getByRole("button", { name: "成人向" }));
    expect(onSegmentChange).toHaveBeenCalledWith("adult");
  });

  it("calls onSegmentChange with correct value when clicking 女性向", () => {
    const onSegmentChange = vi.fn();
    render(<GallerySegmentBar segment="all" onSegmentChange={onSegmentChange} />);
    fireEvent.click(screen.getByRole("button", { name: "女性向" }));
    expect(onSegmentChange).toHaveBeenCalledWith("female");
  });
});
