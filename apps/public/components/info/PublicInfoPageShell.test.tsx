import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/seo", () => ({ SITE_BRAND_NAME: "泛用型產品作坊" }));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { PublicInfoPageShell } from "./PublicInfoPageShell";

describe("PublicInfoPageShell", () => {
  it("renders title", () => {
    render(<PublicInfoPageShell title="關於我們"><p>content</p></PublicInfoPageShell>);
    expect(screen.getByRole("heading", { level: 1, name: "關於我們" })).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(
      <PublicInfoPageShell title="T" description="副標題說明">
        <p>c</p>
      </PublicInfoPageShell>
    );
    expect(screen.getByText("副標題說明")).toBeTruthy();
  });

  it("omits description element when not provided", () => {
    render(<PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>);
    expect(screen.queryByText("副標題說明")).toBeNull();
  });

  it("renders children", () => {
    render(
      <PublicInfoPageShell title="T">
        <p data-testid="child-content">body text</p>
      </PublicInfoPageShell>
    );
    expect(screen.getByTestId("child-content")).toBeTruthy();
  });

  it("renders relatedLinks as <a> elements", () => {
    render(
      <PublicInfoPageShell
        title="T"
        relatedLinks={[
          { href: "/", label: "← 返回台本列表" },
          { href: "/about", label: "關於我們" },
        ]}
      >
        <p>c</p>
      </PublicInfoPageShell>
    );
    const homeLink = screen.getByRole("link", { name: "← 返回台本列表" });
    expect(homeLink.getAttribute("href")).toBe("/");
    const aboutLink = screen.getByRole("link", { name: "關於我們" });
    expect(aboutLink.getAttribute("href")).toBe("/about");
  });

  it("omits footer when no relatedLinks", () => {
    const { container } = render(
      <PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>
    );
    expect(container.querySelector("footer")).toBeNull();
  });

  it("brand link points to home", () => {
    render(<PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>);
    const brand = screen.getByRole("link", { name: /泛用型產品作坊/ });
    expect(brand.getAttribute("href")).toBe("/");
  });

  it("no /gallery links in related links output", () => {
    const { container } = render(
      <PublicInfoPageShell
        title="T"
        relatedLinks={[{ href: "/", label: "首頁" }]}
      >
        <p>c</p>
      </PublicInfoPageShell>
    );
    const links = container.querySelectorAll("a[href]");
    for (const link of links) {
      expect(link.getAttribute("href")).not.toMatch(/^\/gallery/);
    }
  });

  it("renders /about /help /license nav links", () => {
    render(<PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>);
    const links = screen.getAllByRole("link");
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/help");
    expect(hrefs).toContain("/license");
  });

  it("active tab has aria-current=page", () => {
    render(<PublicInfoPageShell title="T" activeKey="help"><p>c</p></PublicInfoPageShell>);
    const activeLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(activeLinks.length).toBeGreaterThan(0);
    expect(activeLinks[0].getAttribute("href")).toBe("/help");
  });

  it("does not render PublicShellTopBar or PublicShellActions", () => {
    const source = require("fs").readFileSync(
      __filename.replace(".test.tsx", ".tsx"),
      "utf-8"
    );
    expect(source).not.toContain("PublicShellTopBar");
    expect(source).not.toContain("PublicShellActions");
  });

  it("studio link points to /dashboard", () => {
    render(<PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>);
    const studioLinks = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") === "/dashboard"
    );
    expect(studioLinks.length).toBeGreaterThan(0);
  });
});
