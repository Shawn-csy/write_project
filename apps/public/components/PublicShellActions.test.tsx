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

describe("PublicShellActions", () => {
  it("renders AppearanceMenu, InfoMenu, and studio links", () => {
    render(<PublicShellActions />);
    expect(screen.getByRole("button", { name: "外觀設定" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "說明與平台資訊" })).toBeTruthy();
    // mobile: "工作室", desktop: "進入工作室"
    expect(screen.getByRole("link", { name: "工作室" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "進入工作室" })).toBeTruthy();
  });

  it("container has stable min-width classes", () => {
    const { container } = render(<PublicShellActions />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/min-w-\[10rem\]/);
    expect(wrapper.className).toMatch(/sm:min-w-\[12rem\]/);
  });

  it("AppearanceMenu has accessible name", () => {
    render(<PublicShellActions />);
    expect(screen.getByRole("button", { name: "外觀設定" })).toBeTruthy();
  });

  it("InfoMenu has accessible name", () => {
    render(<PublicShellActions />);
    expect(screen.getByRole("button", { name: "說明與平台資訊" })).toBeTruthy();
  });

  it("all studio links point to /dashboard", () => {
    render(<PublicShellActions />);
    expect(screen.getByRole("link", { name: "工作室" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.getByRole("link", { name: "進入工作室" }).getAttribute("href")).toBe("/dashboard");
  });

  it("mobile studio link has sm:hidden and 44px touch target (h-11)", () => {
    render(<PublicShellActions />);
    const mobileLink = screen.getByRole("link", { name: "工作室" });
    expect(mobileLink.className).toMatch(/sm:hidden/);
    // Outer <a> must be h-11 (44px touch target)
    expect(mobileLink.className).toMatch(/\bh-11\b/);
    // Visual pill is in the child span
    const pill = mobileLink.querySelector("span")!;
    expect(pill.className).toMatch(/text-\[0\.8125rem\]/);
    expect(pill.className).toMatch(/font-semibold/);
    expect(pill.className).toMatch(/bg-primary/);
  });
});
