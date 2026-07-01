import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryTopBar } from "./GalleryTopBar";

vi.mock("lucide-react", () => ({
  SlidersHorizontal: () => <span data-testid="sliders-icon" />,
  Search: () => <span />,
  ChevronDown: () => <span />,
  MoreHorizontal: () => <span data-testid="more-icon" />,
  X: () => <span data-testid="x-icon" />,
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

  it("tabs are inline (no hamburger)", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    // No hamburger
    expect(screen.queryByRole("button", { name: "開啟導航" })).toBeNull();
    // Tabs visible inline
    expect(screen.getAllByRole("button", { name: "台本" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "作者" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "組織" }).length).toBeGreaterThan(0);
  });

  it("shows filter trigger only on scripts tab", () => {
    const onOpenMobileFilter = vi.fn();
    const { rerender } = render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={onOpenMobileFilter}
      />
    );

    const filterTriggers = screen.getAllByRole("button", { name: "開啟篩選" });
    expect(filterTriggers.length).toBeGreaterThan(0);
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

  it("links to dashboard (desktop trailing)", () => {
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

  it("more button opens bottom action sheet", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    const moreBtn = screen.getByRole("button", { name: "更多選項" });
    expect(moreBtn).toBeTruthy();
    fireEvent.click(moreBtn);
    expect(screen.getByRole("dialog", { name: "更多選項" })).toBeTruthy();
  });

  it("more sheet has studio CTA to /dashboard", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "更多選項" }));
    const studioLink = screen.getByRole("link", { name: "進入工作室" });
    expect(studioLink.getAttribute("href")).toBe("/dashboard");
  });

  it("more sheet shows appearance and info content directly", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "更多選項" }));

    expect(screen.getByText("外觀設定")).toBeTruthy();
    expect(screen.getByTestId("appearance-content")).toBeTruthy();
    expect(screen.getByText("說明與資訊")).toBeTruthy();
    expect(screen.getByTestId("info-content")).toBeTruthy();
  });

  it("more sheet closes on Esc", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "更多選項" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("more sheet closes on backdrop click", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "更多選項" }));
    const dialog = screen.getByRole("dialog");
    // Backdrop is sibling before the sheet panel
    const backdrop = dialog.parentElement!.querySelector("[aria-hidden]");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("more sheet locks body scroll and restores on close", () => {
    document.body.style.overflow = "";
    const { unmount } = render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "更多選項" }));
    expect(document.body.style.overflow).toBe("hidden");
    // Close via Esc
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
    unmount();
  });

  it("Tab wraps within action sheet — last focusable loops to first", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "更多選項" }));
    const sheet = document.getElementById("mobile-action-sheet")!;
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

  it("Shift+Tab wraps within action sheet — first focusable loops to last", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "更多選項" }));
    const sheet = document.getElementById("mobile-action-sheet")!;
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

  it("filter buttons have 44px touch target (h-11 w-11)", () => {
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

  it("more button has 44px touch target (h-11 w-11)", () => {
    render(
      <GalleryTopBar
        activeTab="scripts"
        onTabChange={() => {}}
        onOpenMobileFilter={() => {}}
      />
    );

    const moreBtn = screen.getByRole("button", { name: "更多選項" });
    expect(moreBtn.className).toMatch(/\bh-11\b/);
    expect(moreBtn.className).toMatch(/\bw-11\b/);
  });
});
