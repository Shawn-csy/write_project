import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="search-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

vi.mock("./GalleryViewModeToggle", () => ({
  GalleryViewModeToggle: () => <div data-testid="view-mode-toggle" />,
}));

import { GalleryMobileSheet } from "./GalleryMobileSheet";

const BASE_PROPS = {
  open: true,
  onClose: vi.fn(),
  searchTerm: "",
  onSearchChange: vi.fn(),
  licenseTagShortcuts: [],
  allTags: [],
  selectedTags: [],
  onToggleTag: vi.fn(),
  tagSearch: "",
  onTagSearchChange: vi.fn(),
  displayTags: [],
  hasFilters: false,
  onResetFilters: vi.fn(),
  usage: "all",
  setUsage: vi.fn(),
  viewModeValue: "standard" as const,
  setViewMode: vi.fn(),
};

describe("GalleryMobileSheet", () => {
  afterEach(() => {
    // Ensure body scroll is always restored between tests
    document.body.style.overflow = "";
  });

  it("renders with role=dialog when open", () => {
    render(<GalleryMobileSheet {...BASE_PROPS} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(<GalleryMobileSheet {...BASE_PROPS} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<GalleryMobileSheet {...BASE_PROPS} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "關閉篩選" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Esc calls onClose", () => {
    const onClose = vi.fn();
    render(<GalleryMobileSheet {...BASE_PROPS} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const onClose = vi.fn();
    render(<GalleryMobileSheet {...BASE_PROPS} onClose={onClose} />);
    // backdrop is the sibling div before the sheet panel
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!.querySelector<HTMLElement>(".editorial-scrim");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll when open and restores on close", () => {
    document.body.style.overflow = "";
    const { unmount } = render(<GalleryMobileSheet {...BASE_PROPS} open={true} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("Tab wraps within sheet — last focusable loops to first", () => {
    render(<GalleryMobileSheet {...BASE_PROPS} />);
    const sheet = document.getElementById("gallery-mobile-sheet")!;
    const focusable = Array.from(
      sheet.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    );
    expect(focusable.length).toBeGreaterThan(0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(first);
  });

  it("Shift+Tab wraps within sheet — first focusable loops to last", () => {
    render(<GalleryMobileSheet {...BASE_PROPS} />);
    const sheet = document.getElementById("gallery-mobile-sheet")!;
    const focusable = Array.from(
      sheet.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    );
    expect(focusable.length).toBeGreaterThan(0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
