import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GalleryControlsBar } from "./GalleryControlsBar";

describe("GalleryControlsBar", () => {
  it("inline layout renders usage and view mode controls", () => {
    render(
      <GalleryControlsBar
        usage="all"
        onUsageChange={vi.fn()}
        viewMode="standard"
        onViewModeChange={vi.fn()}
        layout="inline"
      />
    );
    expect(screen.getByRole("button", { name: "全部授權" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "可商用" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "標準" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "密集" })).toBeTruthy();
  });

  it("stacked layout renders section labels", () => {
    render(
      <GalleryControlsBar
        usage="all"
        onUsageChange={vi.fn()}
        viewMode="standard"
        onViewModeChange={vi.fn()}
        layout="stacked"
      />
    );
    expect(screen.getByText("使用權限")).toBeTruthy();
    expect(screen.getByText("顯示模式")).toBeTruthy();
  });

  it("calls onUsageChange when clicking 可商用", () => {
    const onUsageChange = vi.fn();
    render(
      <GalleryControlsBar
        usage="all"
        onUsageChange={onUsageChange}
        viewMode="standard"
        onViewModeChange={vi.fn()}
        layout="inline"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "可商用" }));
    expect(onUsageChange).toHaveBeenCalledWith("commercial");
  });

  it("calls onViewModeChange when clicking 密集", () => {
    const onViewModeChange = vi.fn();
    render(
      <GalleryControlsBar
        usage="all"
        onUsageChange={vi.fn()}
        viewMode="standard"
        onViewModeChange={onViewModeChange}
        layout="inline"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "密集" }));
    expect(onViewModeChange).toHaveBeenCalledWith("compact");
  });
});
