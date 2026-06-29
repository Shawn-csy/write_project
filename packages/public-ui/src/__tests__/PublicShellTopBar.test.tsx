import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    // mobile nav drawer not visible initially (rendered via display none via sm: class,
    // but the toggle button should exist)
    const toggle = screen.getByRole("button", { name: "開啟導航" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "關閉導航" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "關閉導航" }));
    expect(screen.getByRole("button", { name: "開啟導航" })).toBeTruthy();
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
