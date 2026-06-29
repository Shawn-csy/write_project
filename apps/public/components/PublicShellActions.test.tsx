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
  it("renders AppearanceMenu, InfoMenu, and StudioLink", () => {
    render(<PublicShellActions />);
    expect(screen.getByRole("button", { name: "外觀設定" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "說明與平台資訊" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "進入工作室" })).toBeTruthy();
  });

  it("container has stable min-width classes", () => {
    const { container } = render(<PublicShellActions />);
    const wrapper = container.firstChild as HTMLElement;
    // min-w-24 for mobile, sm:min-w-[12rem] for desktop
    expect(wrapper.className).toMatch(/min-w-24/);
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

  it("StudioLink points to /dashboard", () => {
    render(<PublicShellActions />);
    const link = screen.getByRole("link", { name: "進入工作室" });
    expect(link.getAttribute("href")).toBe("/dashboard");
  });
});
