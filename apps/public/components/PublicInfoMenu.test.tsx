import React from "react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { PublicInfoMenu } from "./PublicInfoMenu";

vi.mock("lucide-react", () => ({
  CircleHelp: () => <span data-testid="circle-help-icon" />,
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
    expect(screen.getByRole("menuitem", { name: "使用說明" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "授權說明" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "關於我們" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "隱私政策" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "使用條款" })).toBeTruthy();
  });

  it("link hrefs are correct", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(screen.getByRole("menuitem", { name: "使用說明" }).getAttribute("href")).toBe("/help");
    expect(screen.getByRole("menuitem", { name: "授權說明" }).getAttribute("href")).toBe("/license");
    expect(screen.getByRole("menuitem", { name: "關於我們" }).getAttribute("href")).toBe("/about");
    expect(screen.getByRole("menuitem", { name: "隱私政策" }).getAttribute("href")).toBe("/privacy");
    expect(screen.getByRole("menuitem", { name: "使用條款" }).getAttribute("href")).toBe("/terms");
  });

  it("order: 使用說明 → 授權說明 → 關於我們 → 隱私政策 → 使用條款", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    const items = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(items.indexOf("使用說明")).toBeLessThan(items.indexOf("授權說明"));
    expect(items.indexOf("授權說明")).toBeLessThan(items.indexOf("關於我們"));
    expect(items.indexOf("關於我們")).toBeLessThan(items.indexOf("隱私政策"));
    expect(items.indexOf("隱私政策")).toBeLessThan(items.indexOf("使用條款"));
  });

  it("does not contain theme or appearance controls", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    expect(screen.queryByText("亮色")).toBeNull();
    expect(screen.queryByText("暗色")).toBeNull();
    expect(screen.queryByText("跟隨系統")).toBeNull();
  });

  it("has one separator before policy links", async () => {
    const user = userEvent.setup();
    render(<PublicInfoMenu />);
    await user.click(screen.getByRole("button", { name: "說明與平台資訊" }));
    const sep = document.querySelector("[data-testid='public-info-menu-separator']");
    expect(sep).not.toBeNull();
  });
});
