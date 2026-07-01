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
    // desktop text link + mobile icon link both present
    const studioLinks = screen.getAllByRole("link", { name: /進入工作室/ });
    expect(studioLinks.length).toBe(2);
    studioLinks.forEach((l) => expect(l.getAttribute("href")).toBe("/dashboard"));
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
    screen.getAllByRole("link", { name: /進入工作室/ }).forEach((l) => {
      expect(l.getAttribute("href")).toBe("/dashboard");
    });
  });

  it("mobile studio link meets 44px touch target (h-11 w-11)", () => {
    render(<PublicShellActions />);
    // mobile link has sm:hidden; desktop link has hidden sm:inline-flex
    const links = screen.getAllByRole("link", { name: /進入工作室/ });
    const mobileLink = links.find((l) => l.className.includes("sm:hidden"));
    expect(mobileLink).toBeTruthy();
    expect(mobileLink!.className).toMatch(/h-11/);
    expect(mobileLink!.className).toMatch(/w-11/);
  });
});
