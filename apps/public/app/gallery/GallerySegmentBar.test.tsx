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

  it("active segment button has underline indicator", () => {
    render(<GallerySegmentBar segment="adult" onSegmentChange={vi.fn()} />);
    const adultBtn = screen.getByRole("button", { name: "成人向" });
    // active button contains the underline span child
    expect(adultBtn.querySelector("span")).toBeTruthy();
    // inactive button has no span child
    const allBtn = screen.getByRole("button", { name: "全部" });
    expect(allBtn.querySelector("span")).toBeNull();
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
