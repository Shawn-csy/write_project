import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GalleryFilterPanel, DEFAULT_VISIBLE_TAG_COUNT } from "./GalleryFilterPanel";

vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="search-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

const MANY_TAGS = Array.from({ length: 15 }, (_, i) => `tag-${i + 1}`);

const BASE_PROPS = {
  searchTerm: "",
  onSearchChange: vi.fn(),
  licenseTagShortcuts: [],
  allTags: MANY_TAGS,
  selectedTags: [] as string[],
  onToggleTag: vi.fn(),
  tagSearch: "",
  onTagSearchChange: vi.fn(),
  displayTags: MANY_TAGS,
  hasFilters: false,
  onResetFilters: vi.fn(),
};

describe("GalleryFilterPanel — tag collapse", () => {
  it("shows only DEFAULT_VISIBLE_TAG_COUNT tags when collapsed", () => {
    render(<GalleryFilterPanel {...BASE_PROPS} />);
    const tagButtons = screen.getAllByRole("button").filter((b) =>
      MANY_TAGS.includes(b.textContent ?? "")
    );
    expect(tagButtons).toHaveLength(DEFAULT_VISIBLE_TAG_COUNT);
  });

  it("shows 展開更多 button with hidden count", () => {
    render(<GalleryFilterPanel {...BASE_PROPS} />);
    const expandBtn = screen.getByText(/展開更多/);
    expect(expandBtn.textContent).toContain(
      String(MANY_TAGS.length - DEFAULT_VISIBLE_TAG_COUNT)
    );
  });

  it("clicking 展開更多 reveals all tags", () => {
    render(<GalleryFilterPanel {...BASE_PROPS} />);
    fireEvent.click(screen.getByText(/展開更多/));
    const tagButtons = screen.getAllByRole("button").filter((b) =>
      MANY_TAGS.includes(b.textContent ?? "")
    );
    expect(tagButtons).toHaveLength(MANY_TAGS.length);
  });

  it("selected hidden tag remains visible when collapsed", () => {
    // Select a tag beyond the visible threshold
    const hiddenTag = MANY_TAGS[DEFAULT_VISIBLE_TAG_COUNT + 1];
    render(
      <GalleryFilterPanel {...BASE_PROPS} selectedTags={[hiddenTag]} />
    );
    expect(screen.getByRole("button", { name: hiddenTag })).toBeTruthy();
  });

  it("hidden count decreases when selected tag is promoted to visible", () => {
    // No selection: hidden = total - DEFAULT_VISIBLE_TAG_COUNT
    const { unmount } = render(<GalleryFilterPanel {...BASE_PROPS} />);
    expect(screen.getByText(/展開更多/).textContent).toContain(
      String(MANY_TAGS.length - DEFAULT_VISIBLE_TAG_COUNT)
    );
    unmount();

    // With 2 hidden tags selected: they're promoted, so hidden count drops by 2
    const selected = [MANY_TAGS[DEFAULT_VISIBLE_TAG_COUNT], MANY_TAGS[DEFAULT_VISIBLE_TAG_COUNT + 1]];
    render(<GalleryFilterPanel {...BASE_PROPS} selectedTags={selected} />);
    expect(screen.getByText(/展開更多/).textContent).toContain(
      String(MANY_TAGS.length - DEFAULT_VISIBLE_TAG_COUNT - selected.length)
    );
  });

  it("does not collapse when few tags", () => {
    const fewTags = ["a", "b", "c"];
    render(
      <GalleryFilterPanel
        {...BASE_PROPS}
        allTags={fewTags}
        displayTags={fewTags}
      />
    );
    expect(screen.queryByText(/展開更多/)).toBeNull();
  });

  it("does not collapse when searching tags", () => {
    render(
      <GalleryFilterPanel {...BASE_PROPS} tagSearch="tag" />
    );
    // All matching tags shown, no expand button
    expect(screen.queryByText(/展開更多/)).toBeNull();
  });
});

describe("GalleryFilterPanel — usage filter", () => {
  it("renders usage options when usage prop provided", () => {
    render(
      <GalleryFilterPanel
        {...BASE_PROPS}
        usage="all"
        onUsageChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "全部授權" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "可商用" })).toBeTruthy();
  });

  it("does not render usage section when usage prop omitted", () => {
    render(<GalleryFilterPanel {...BASE_PROPS} />);
    expect(screen.queryByText("使用權限")).toBeNull();
  });

  it("clicking 可商用 calls onUsageChange with 'commercial'", () => {
    const onUsageChange = vi.fn();
    render(
      <GalleryFilterPanel {...BASE_PROPS} usage="all" onUsageChange={onUsageChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "可商用" }));
    expect(onUsageChange).toHaveBeenCalledWith("commercial");
  });
});
