import React from "react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { PublicInfoMenu } from "./PublicInfoMenu";

vi.mock("lucide-react", () => ({
  CircleHelp: () => <span data-testid="circle-help-icon" />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe("PublicInfoMenu", () => {
  it("trigger has aria-label 說明與平台資訊", () => {
    render(<PublicInfoMenu />);
    expect(screen.getByRole("button", { name: "說明與平台資訊" })).toBeTruthy();
  });

  it("trigger has 44px hit target class", () => {
    render(<PublicInfoMenu />);
    const btn = screen.getByRole("button", { name: "說明與平台資訊" });
    expect(btn.className).toContain("h-11");
    expect(btn.className).toContain("w-11");
  });

  it("renders all five links after open", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(screen.getByRole("link", { name: /使用說明/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /授權說明/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /關於我們/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /隱私政策/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /使用條款/ })).toBeTruthy();
  });

  it("link hrefs are correct", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(screen.getByRole("link", { name: /使用說明/ }).getAttribute("href")).toBe("/help");
    expect(screen.getByRole("link", { name: /授權說明/ }).getAttribute("href")).toBe("/license");
    expect(screen.getByRole("link", { name: /關於我們/ }).getAttribute("href")).toBe("/about");
    expect(screen.getByRole("link", { name: /隱私政策/ }).getAttribute("href")).toBe("/privacy");
    expect(screen.getByRole("link", { name: /使用條款/ }).getAttribute("href")).toBe("/terms");
  });

  it("each top-level link has a description", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(screen.getByText("閱讀、發布與工作室操作")).toBeTruthy();
    expect(screen.getByText("台本使用、改作與商業使用規則")).toBeTruthy();
    expect(screen.getByText("平台理念與聯絡方式")).toBeTruthy();
  });

  it("each policy link has a description", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(screen.getByText("資料使用與 Google API 說明")).toBeTruthy();
    expect(screen.getByText("平台使用規範")).toBeTruthy();
  });

  it("order: 使用說明 → 授權說明 → 關於我們 → 隱私政策 → 使用條款", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    const links = screen.getAllByRole("link");
    const labels = links.map((el) => el.textContent ?? "");
    const idx = (text: string) => labels.findIndex((l) => l.includes(text));
    expect(idx("使用說明")).toBeLessThan(idx("授權說明"));
    expect(idx("授權說明")).toBeLessThan(idx("關於我們"));
    expect(idx("關於我們")).toBeLessThan(idx("隱私政策"));
    expect(idx("隱私政策")).toBeLessThan(idx("使用條款"));
  });

  it("has separator between groups", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(document.querySelector("[data-testid='public-info-menu-separator']")).not.toBeNull();
  });

  it("does not contain theme or appearance controls", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(screen.queryByText("亮色")).toBeNull();
    expect(screen.queryByText("暗色")).toBeNull();
    expect(screen.queryByText("跟隨系統")).toBeNull();
  });

  it("no nested interactive elements inside links", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    const links = screen.getAllByRole("link");
    for (const link of links) {
      const nested = link.querySelectorAll("button, input, select, textarea");
      expect(nested.length).toBe(0);
    }
  });
});
