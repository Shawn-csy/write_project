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

  it("mobile tabs render inline (no hamburger)", () => {
    render(
      <PublicShellTopBar
        tabs={[
          { key: "scripts", label: "台本", onSelect: () => {} },
          { key: "authors", label: "作者", onSelect: () => {} },
        ]}
        activeTab="scripts"
      />
    );
    // No hamburger button
    expect(screen.queryByRole("button", { name: "開啟導航" })).toBeNull();
    // Mobile tabs are inline nav elements
    const header = screen.getByRole("banner");
    const navs = header.querySelectorAll('nav[aria-label="公開頁面導航"]');
    // Desktop nav + mobile nav = 2
    expect(navs.length).toBe(2);
  });

  it("mobile tab click triggers onSelect", () => {
    const handler = vi.fn();
    render(
      <PublicShellTopBar
        tabs={[{ key: "authors", label: "作者", onSelect: handler }]}
      />
    );
    // Both desktop and mobile tabs exist — click any
    const buttons = screen.getAllByRole("button", { name: "作者" });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("desktop tabs still render inline", () => {
    render(
      <PublicShellTopBar
        tabs={[{ key: "about", label: "關於", href: "/about" }]}
        activeTab="about"
      />
    );
    const header = screen.getByRole("banner");
    const nav = header.querySelector('nav[aria-label="公開頁面導航"]');
    expect(nav).toBeTruthy();
  });

  it("no tabs = no tab nav", () => {
    render(<PublicShellTopBar brandName="B" />);
    expect(screen.queryByRole("button", { name: "開啟導航" })).toBeNull();
    const header = screen.getByRole("banner");
    expect(header.querySelector('nav[aria-label="公開頁面導航"]')).toBeNull();
  });

  it("trailing slot renders", () => {
    render(<PublicShellTopBar trailing={<span data-testid="trail">actions</span>} />);
    expect(screen.getByTestId("trail")).toBeTruthy();
  });

  it("mobileLeadingAction slot renders", () => {
    render(
      <PublicShellTopBar
        mobileLeadingAction={<button aria-label="篩選">F</button>}
      />
    );
    expect(screen.getByRole("button", { name: "篩選" })).toBeTruthy();
  });

  it("mobileTrailingAction slot renders", () => {
    render(
      <PublicShellTopBar
        mobileTrailingAction={<button aria-label="更多">M</button>}
      />
    );
    expect(screen.getByRole("button", { name: "更多" })).toBeTruthy();
  });

  it("no Next.js import — module resolves without next/link", async () => {
    const mod = await import("../gallery/PublicShellTopBar");
    expect(typeof mod.PublicShellTopBar).toBe("function");
  });
});
