import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/PublicAppearanceMenu", () => ({
  PublicAppearanceMenu: () => <button aria-label="外觀設定" />,
}));
vi.mock("@/components/PublicInfoMenu", () => ({
  PublicInfoMenu: () => <button aria-label="說明與平台資訊" />,
}));
vi.mock("@/lib/motion/useAnimePressFeedback", () => ({
  useAnimePressFeedback: () => ({ ref: { current: null }, handlers: {} }),
}));

import { PublicShellActions } from "./PublicShellActions";

describe("PublicShellActions (desktop-only)", () => {
  it("renders AppearanceMenu, InfoMenu, and studio link", () => {
    render(<PublicShellActions />);
    expect(screen.getByRole("button", { name: "外觀設定" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "說明與平台資訊" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "進入工作室" })).toBeTruthy();
  });

  it("studio link points to /dashboard", () => {
    render(<PublicShellActions />);
    expect(screen.getByRole("link", { name: "進入工作室" }).getAttribute("href")).toBe("/dashboard");
  });

  it("no mobile studio link (mobile handled by action sheet)", () => {
    render(<PublicShellActions />);
    // Only one studio link — desktop "進入工作室"
    const links = screen.getAllByRole("link");
    const dashboardLinks = links.filter((l) => l.getAttribute("href") === "/dashboard");
    expect(dashboardLinks).toHaveLength(1);
  });
});
