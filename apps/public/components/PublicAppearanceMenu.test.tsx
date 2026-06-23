import React from "react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { PublicAppearanceMenu } from "./PublicAppearanceMenu";
import { DEFAULT_APPEARANCE } from "@/lib/publicAppearancePreferences";

const setTheme = vi.fn();
const setReaderFontFamily = vi.fn();
const setReaderFontSize = vi.fn();
const setReaderLineHeight = vi.fn();

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
    setReaderFontFamily,
    setReaderFontSize,
    setReaderLineHeight,
  }),
}));

describe("PublicAppearanceMenu", () => {
  it("trigger has aria-label 外觀設定", () => {
    render(<PublicAppearanceMenu />);
    expect(screen.getByRole("button", { name: "外觀設定" })).toBeTruthy();
  });

  it("trigger has 44px hit target class", () => {
    render(<PublicAppearanceMenu />);
    expect(screen.getByRole("button", { name: "外觀設定" }).className).toContain("h-11");
    expect(screen.getByRole("button", { name: "外觀設定" }).className).toContain("w-11");
  });

  it("shows theme options after open", async () => {
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    expect(screen.getByText("亮色")).toBeTruthy();
    expect(screen.getByText("暗色")).toBeTruthy();
    expect(screen.getByText("跟隨系統")).toBeTruthy();
  });

  it("clicking 亮色 calls setTheme('light')", async () => {
    setTheme.mockClear();
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    await user.click(screen.getByText("亮色"));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("clicking 暗色 calls setTheme('dark')", async () => {
    setTheme.mockClear();
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    await user.click(screen.getByText("暗色"));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("clicking 跟隨系統 calls setTheme('system')", async () => {
    setTheme.mockClear();
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    await user.click(screen.getByText("跟隨系統"));
    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("shows font family options after open", async () => {
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    expect(screen.getByText("無襯線")).toBeTruthy();
    expect(screen.getByText("襯線")).toBeTruthy();
    expect(screen.getByText("等寬")).toBeTruthy();
  });

  it("clicking 襯線 calls setReaderFontFamily('serif')", async () => {
    setReaderFontFamily.mockClear();
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    await user.click(screen.getByText("襯線"));
    expect(setReaderFontFamily).toHaveBeenCalledWith("serif");
  });

  it("clicking 18px calls setReaderFontSize(18)", async () => {
    setReaderFontSize.mockClear();
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    await user.click(screen.getByText("18px"));
    expect(setReaderFontSize).toHaveBeenCalledWith(18);
  });

  it("clicking 寬鬆 calls setReaderLineHeight(1.8)", async () => {
    setReaderLineHeight.mockClear();
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    await user.click(screen.getByText("寬鬆"));
    expect(setReaderLineHeight).toHaveBeenCalledWith(1.8);
  });

  it("does not contain info/nav links", async () => {
    const user = userEvent.setup();
    render(<PublicAppearanceMenu />);
    await user.click(screen.getByRole("button", { name: "外觀設定" }));
    expect(screen.queryByText("使用說明")).toBeNull();
    expect(screen.queryByText("關於我們")).toBeNull();
    expect(screen.queryByText("隱私政策")).toBeNull();
  });
});
