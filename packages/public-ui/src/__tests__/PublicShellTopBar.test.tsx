import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PublicShellTopBar } from "../gallery/PublicShellTopBar";

describe("PublicShellTopBar", () => {
  it("renders brand name", () => {
    render(<PublicShellTopBar brandName="TestBrand" />);
    expect(screen.getByText("TestBrand")).toBeTruthy();
  });

  it("brand link uses brandHref", () => {
    render(<PublicShellTopBar brandName="B" brandHref="/home" />);
    const link = screen.getByText("B").closest("a");
    expect(link?.getAttribute("href")).toBe("/home");
  });

  it("href tab renders <a>", () => {
    render(
      <PublicShellTopBar
        tabs={[{ key: "about", label: "關於", href: "/about" }]}
        activeTab="about"
      />
    );
    // desktop tab
    const anchors = screen.getAllByRole("link", { name: "關於" });
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors[0].tagName).toBe("A");
    expect(anchors[0].getAttribute("href")).toBe("/about");
  });

  it("callback tab renders <button>", () => {
    const handler = vi.fn();
    render(
      <PublicShellTopBar
        tabs={[{ key: "scripts", label: "台本", onSelect: handler }]}
        activeTab="scripts"
      />
    );
    const buttons = screen.getAllByRole("button", { name: "台本" });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("active tab has aria-current=page", () => {
    render(
      <PublicShellTopBar
        tabs={[
          { key: "about", label: "關於", href: "/about" },
          { key: "help", label: "說明", href: "/help" },
        ]}
        activeTab="about"
      />
    );
    const active = screen.getAllByRole("link", { name: "關於" });
    expect(active[0].getAttribute("aria-current")).toBe("page");
    const inactive = screen.getAllByRole("link", { name: "說明" });
    expect(inactive[0].getAttribute("aria-current")).toBeNull();
  });

  it("mobile nav opens and closes", () => {
    render(
      <PublicShellTopBar
        tabs={[{ key: "about", label: "關於", href: "/about" }]}
      />
    );
    const toggle = screen.getByRole("button", { name: "開啟導航" });
    fireEvent.click(toggle);
    // Overlay close button inside dialog
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "關閉導航" }));
    expect(screen.getByRole("button", { name: "開啟導航" })).toBeTruthy();
  });

  it("mobile nav uses overlay contract — role=dialog", () => {
    render(
      <PublicShellTopBar
        tabs={[{ key: "about", label: "關於", href: "/about" }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "開啟導航" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    // main content top offset not affected — no inline drawer in header
    const header = screen.getByRole("banner");
    // overlay is portalled outside header; header only has the topbar row
    expect(header.querySelector('[role="dialog"]')).toBeNull();
  });

  it("mobile overlay includes /dashboard studio link when mobileStudioHref given", () => {
    render(
      <PublicShellTopBar
        tabs={[{ key: "about", label: "關於", href: "/about" }]}
        mobileStudioHref="/dashboard"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "開啟導航" }));
    const studioLink = screen.getByRole("link", { name: "進入工作室" });
    expect(studioLink.getAttribute("href")).toBe("/dashboard");
  });

  it("tab click closes mobile overlay", () => {
    const handler = vi.fn();
    render(
      <PublicShellTopBar
        tabs={[{ key: "scripts", label: "台本", onSelect: handler }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "開啟導航" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    // Click the tab button inside the overlay
    fireEvent.click(within(dialog).getByRole("button", { name: "台本" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Esc closes mobile overlay", () => {
    render(
      <PublicShellTopBar
        tabs={[{ key: "about", label: "關於", href: "/about" }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "開啟導航" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("desktop tabs still render inline (not inside dialog)", () => {
    render(
      <PublicShellTopBar
        tabs={[{ key: "about", label: "關於", href: "/about" }]}
        activeTab="about"
      />
    );
    // Nav inside header (not inside a dialog) should exist even without overlay open
    const header = screen.getByRole("banner");
    const nav = header.querySelector('nav[aria-label="公開頁面導航"]');
    expect(nav).toBeTruthy();
  });

  it("no tabs = no hamburger button", () => {
    render(<PublicShellTopBar brandName="B" />);
    expect(screen.queryByRole("button", { name: "開啟導航" })).toBeNull();
  });

  it("trailing slot renders", () => {
    render(<PublicShellTopBar trailing={<span data-testid="trail">actions</span>} />);
    expect(screen.getByTestId("trail")).toBeTruthy();
  });

  it("no Next.js import — module resolves without next/link", async () => {
    // If this import succeeds without mocking next/link, the module is Next-free.
    const mod = await import("../gallery/PublicShellTopBar");
    expect(typeof mod.PublicShellTopBar).toBe("function");
  });
});
