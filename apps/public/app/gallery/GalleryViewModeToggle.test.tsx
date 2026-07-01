import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GalleryViewModeToggle } from "./GalleryViewModeToggle";

describe("GalleryViewModeToggle", () => {
  it("renders both mode buttons", () => {
    render(<GalleryViewModeToggle value="standard" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "標準" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "密集" })).toBeTruthy();
  });

  it("active button has aria-pressed=true, inactive has aria-pressed=false", () => {
    render(<GalleryViewModeToggle value="compact" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "密集" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "標準" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onChange with correct mode on click", () => {
    const onChange = vi.fn();
    render(<GalleryViewModeToggle value="standard" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "密集" }));
    expect(onChange).toHaveBeenCalledWith("compact");
  });

  it("buttons have min-h-[44px] hit target class", () => {
    render(<GalleryViewModeToggle value="standard" onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "標準" });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("group has aria-label for a11y", () => {
    render(<GalleryViewModeToggle value="standard" onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "顯示模式" })).toBeTruthy();
  });
});
