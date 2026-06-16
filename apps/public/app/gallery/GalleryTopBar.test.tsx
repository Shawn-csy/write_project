import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryTopBar } from "./GalleryTopBar";

vi.mock("lucide-react", () => ({
  SlidersHorizontal: () => <span data-testid="sliders-icon" />,
}));

vi.mock("@/components/PublicShellActions", () => ({
  PublicShellActions: () => <a href="/dashboard">工作室</a>,
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

  it("shows mobile filter trigger only on scripts tab", () => {
    const onOpenMobileFilter = vi.fn();
    const { rerender } = render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={onOpenMobileFilter}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "開啟篩選" }));
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
});
