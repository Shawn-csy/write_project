import React from "react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { PublicAppearanceMenu } from "./PublicAppearanceMenu";
import { DEFAULT_APPEARANCE } from "@/lib/publicAppearancePreferences";

const setTheme = vi.fn();
const setSiteTextScale = vi.fn();

vi.mock("lucide-react", () => ({
  Sun: () => <span data-testid="sun-icon" />,
  Moon: () => <span data-testid="moon-icon" />,
  Monitor: () => <span data-testid="monitor-icon" />,
  SlidersHorizontal: () => <span data-testid="sliders-icon" />,
}));

vi.mock("@/components/PublicAppearanceContext", () => ({
  usePublicAppearance: () => ({
    prefs: DEFAULT_APPEARANCE,
    setTheme,
    setSiteTextScale,
  }),
}));

async function openPanel() {
  const user = userEvent.setup();
  render(<PublicAppearanceMenu />);
  await user.click(screen.getByRole("button", { name: "外觀設定" }));
  return user;
}

describe("PublicAppearanceMenu", () => {
  it("trigger has aria-label 外觀設定", () => {
    render(<PublicAppearanceMenu />);
    expect(screen.getByRole("button", { name: "外觀設定" })).toBeTruthy();
  });

  it("trigger has 44px hit target class", () => {
    render(<PublicAppearanceMenu />);
    const btn = screen.getByRole("button", { name: "外觀設定" });
    expect(btn.className).toContain("h-11");
    expect(btn.className).toContain("w-11");
  });

  it("shows theme buttons after open", async () => {
    await openPanel();
    expect(screen.getByRole("button", { name: "亮色" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "暗色" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "跟隨系統" })).toBeTruthy();
  });

  it("clicking 亮色 calls setTheme('light')", async () => {
    setTheme.mockClear();
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: "亮色" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("clicking 暗色 calls setTheme('dark')", async () => {
    setTheme.mockClear();
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: "暗色" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("clicking 跟隨系統 calls setTheme('system')", async () => {
    setTheme.mockClear();
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: "跟隨系統" }));
    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("shows site text scale options after open", async () => {
    await openPanel();
    const group = screen.getByRole("group", { name: "首頁文字" });
    expect(within(group).getByRole("button", { name: "精簡" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "標準" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "舒適" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "大字" })).toBeTruthy();
  });

  it("clicking 舒適 calls setSiteTextScale('comfortable')", async () => {
    setSiteTextScale.mockClear();
    const user = await openPanel();
    const group = screen.getByRole("group", { name: "首頁文字" });
    await user.click(within(group).getByRole("button", { name: "舒適" }));
    expect(setSiteTextScale).toHaveBeenCalledWith("comfortable");
  });

  it("active site text scale has aria-pressed=true", async () => {
    // DEFAULT_APPEARANCE.siteTextScale = "default"
    await openPanel();
    const group = screen.getByRole("group", { name: "首頁文字" });
    expect(within(group).getByRole("button", { name: "標準" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "精簡" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("does not contain info/nav links", async () => {
    await openPanel();
    expect(screen.queryByText("使用說明")).toBeNull();
    expect(screen.queryByText("關於我們")).toBeNull();
    expect(screen.queryByText("隱私政策")).toBeNull();
  });

  it("active theme button has aria-pressed=true", async () => {
    // DEFAULT_APPEARANCE.theme = "system"
    await openPanel();
    const systemBtn = screen.getByRole("button", { name: "跟隨系統" });
    expect(systemBtn.getAttribute("aria-pressed")).toBe("true");
    const lightBtn = screen.getByRole("button", { name: "亮色" });
    expect(lightBtn.getAttribute("aria-pressed")).toBe("false");
  });
});
