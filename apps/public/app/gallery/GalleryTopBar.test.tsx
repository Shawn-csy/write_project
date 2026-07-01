import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryTopBar } from "./GalleryTopBar";

vi.mock("lucide-react", () => ({
  SlidersHorizontal: () => <span data-testid="sliders-icon" />,
  Search: () => <span />,
  ChevronDown: () => <span />,
  Sun: () => <span />,
  Moon: () => <span />,
  Monitor: () => <span />,
}));

vi.mock("@/components/PublicShellActions", () => ({
  PublicShellActions: () => <a href="/dashboard">工作室</a>,
}));

vi.mock("@/components/PublicAppearanceMenu", () => ({
  PublicAppearanceMenu: () => <button aria-label="外觀設定" />,
  AppearanceMenuContent: () => <div data-testid="appearance-content" />,
}));

vi.mock("@/components/PublicInfoMenu", () => ({
  PublicInfoMenu: () => <button aria-label="說明與平台資訊" />,
  InfoMenuContent: () => <div data-testid="info-content" />,
}));

describe("GalleryTopBar", () => {
  it("renders tabs and dispatches tab changes", () => {
    const onTabChange = vi.fn();
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={onTabChange}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "作者" })[0]);
    expect(onTabChange).toHaveBeenCalledWith("authors");
  });

  it("shows responsive filter triggers only on scripts tab", () => {
    const onOpenMobileFilter = vi.fn();
    const { rerender } = render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={onOpenMobileFilter}
      />
    );

    const filterTriggers = screen.getAllByRole("button", { name: "開啟篩選" });
    expect(filterTriggers).toHaveLength(2);
    fireEvent.click(filterTriggers[0]);
    expect(onOpenMobileFilter).toHaveBeenCalledTimes(1);

    rerender(
      <GalleryTopBar
        activeTab="authors"
        onTabChange={() => {}}
        onOpenMobileFilter={onOpenMobileFilter}
      />
    );
    expect(screen.queryByRole("button", { name: "開啟篩選" })).toBeNull();
  });

  it("links to dashboard", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    expect(screen.getByRole("link", { name: "工作室" }).getAttribute("href")).toBe(
      "/dashboard"
    );
  });

  it("filter buttons have 44px (h-11 w-11) touch target", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    const filterButtons = screen.getAllByRole("button", { name: "開啟篩選" });
    for (const btn of filterButtons) {
      const classes = btn.className;
      expect(classes).toMatch(/\bh-11\b/);
      expect(classes).toMatch(/\bw-11\b/);
    }
  });
});
