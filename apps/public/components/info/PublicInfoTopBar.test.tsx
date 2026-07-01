import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicInfoTopBar } from "./PublicInfoTopBar";

vi.mock("@/lib/seo", () => ({ SITE_BRAND_NAME: "泛用型產品作坊" }));

describe("PublicInfoTopBar", () => {
  it("brand link points to /", () => {
    render(<PublicInfoTopBar />);
    const brandLinks = screen.getAllByRole("link", { name: /泛用型產品作坊/ });
    for (const link of brandLinks) {
      expect(link.getAttribute("href")).toBe("/");
    }
  });

  it("nav items are <a> not <button>", () => {
    const { container } = render(<PublicInfoTopBar />);
    const navs = container.querySelectorAll("nav");
    for (const nav of navs) {
      const buttons = nav.querySelectorAll("button");
      expect(buttons.length).toBe(0);
    }
  });

  it("renders /about /help /license tab links", () => {
    render(<PublicInfoTopBar />);
    const links = screen.getAllByRole("link");
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/help");
    expect(hrefs).toContain("/license");
  });

  it("studio link points to /dashboard", () => {
    render(<PublicInfoTopBar />);
    const studioLinks = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") === "/dashboard"
    );
    expect(studioLinks.length).toBeGreaterThan(0);
  });

  it("active tab has aria-current=page", () => {
    render(<PublicInfoTopBar activeKey="help" />);
    const activeLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(activeLinks.length).toBeGreaterThan(0);
    expect(activeLinks[0].getAttribute("href")).toBe("/help");
  });

  it("inactive tabs have no aria-current", () => {
    render(<PublicInfoTopBar activeKey="about" />);
    const allLinks = screen.getAllByRole("link");
    const helpLink = allLinks.find((l) => l.getAttribute("href") === "/help");
    expect(helpLink?.getAttribute("aria-current")).toBeNull();
  });

  it("no PublicShellTopBar rendered", () => {
    // source-level: component must not import client shell
    const source = require("fs").readFileSync(__filename.replace(".test.tsx", ".tsx"), "utf-8");
    expect(source).not.toContain("PublicShellTopBar");
    expect(source).not.toContain("PublicShellActions");
    // directive must not appear at the start of a line (comment mentions are ok)
    expect(source).not.toMatch(/^"use client"/m);
  });

  it("no info dropdown or appearance dropdown rendered", () => {
    const { container } = render(<PublicInfoTopBar />);
    // No menu buttons (hamburger, dropdowns) should exist
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(0);
  });
});
