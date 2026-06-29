import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { PublicShellTopBarProps } from "@write/public-ui/PublicShellTopBar";

let capturedProps: PublicShellTopBarProps | null = null;

vi.mock("@write/public-ui/PublicShellTopBar", () => ({
  PublicShellTopBar: (props: PublicShellTopBarProps) => {
    capturedProps = props;
    return (
      <header>
        <a href={props.brandHref ?? "/"}>{props.brandName ?? "Brand"}</a>
        <div data-testid="trailing">{props.trailing}</div>
      </header>
    );
  },
}));

vi.mock("@/components/PublicShellActions", () => ({
  PublicShellActions: () => <div data-testid="shell-actions" />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { beforeEach } from "vitest";
import { PublicInfoPageShell } from "./PublicInfoPageShell";

describe("PublicInfoPageShell", () => {
  beforeEach(() => { capturedProps = null; });

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

  it("passes PublicShellActions to topbar trailing slot", () => {
    render(<PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>);
    expect(screen.getByTestId("shell-actions")).toBeTruthy();
  });

  it("brand link points to home", () => {
    render(<PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>);
    const brand = screen.getByRole("link", { name: "公開台本" });
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

  it("passes info tabs with /about /help /license hrefs to topbar", () => {
    render(<PublicInfoPageShell title="T"><p>c</p></PublicInfoPageShell>);
    const tabs = capturedProps?.tabs ?? [];
    const hrefs = tabs.map((t) => t.href);
    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/help");
    expect(hrefs).toContain("/license");
  });

  it("passes activeKey as activeTab to topbar", () => {
    render(<PublicInfoPageShell title="T" activeKey="help"><p>c</p></PublicInfoPageShell>);
    expect(capturedProps?.activeTab).toBe("help");
  });
});
