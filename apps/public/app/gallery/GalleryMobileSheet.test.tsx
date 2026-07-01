import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-icon" />,
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

  it("renders a quick search field before advanced filters", () => {
    render(<GalleryMobileSheet {...BASE_PROPS} />);

    expect(screen.getByText("搜尋台本")).toBeTruthy();
    expect(screen.getByPlaceholderText("輸入作品、作者、標籤...")).toBeTruthy();
    expect(screen.getByRole("button", { name: "進階篩選" })).toBeTruthy();
    expect(screen.queryByTestId("view-mode-toggle")).toBeNull();
  });

  it("typing in quick search calls onSearchChange", () => {
    const onSearchChange = vi.fn();
    render(<GalleryMobileSheet {...BASE_PROPS} onSearchChange={onSearchChange} />);

    fireEvent.change(screen.getByPlaceholderText("輸入作品、作者、標籤..."), {
      target: { value: "女朋友" },
    });

    expect(onSearchChange).toHaveBeenCalledWith("女朋友");
  });

  it("clear search button clears the quick search", () => {
    const onSearchChange = vi.fn();
    render(
      <GalleryMobileSheet
        {...BASE_PROPS}
        searchTerm="女朋友"
        onSearchChange={onSearchChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "清除搜尋" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("opens advanced filters on demand", () => {
    render(<GalleryMobileSheet {...BASE_PROPS} />);

    const advancedButton = screen.getByRole("button", { name: "進階篩選" });
    expect(advancedButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("view-mode-toggle")).toBeNull();

    fireEvent.click(advancedButton);

    expect(advancedButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("view-mode-toggle")).toBeTruthy();
    expect(screen.queryByPlaceholderText("搜尋台本...")).toBeNull();
  });

  it("auto-opens advanced filters when advanced conditions are active", () => {
    render(
      <GalleryMobileSheet
        {...BASE_PROPS}
        selectedTags={["甜蜜"]}
        usage="commercial"
      />
    );

    expect(screen.getByText("已套用 2 個進階條件")).toBeTruthy();
    expect(screen.getByRole("button", { name: /進階篩選/ }).getAttribute("aria-expanded")).toBe(
      "true"
    );
    expect(screen.getByTestId("view-mode-toggle")).toBeTruthy();
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
