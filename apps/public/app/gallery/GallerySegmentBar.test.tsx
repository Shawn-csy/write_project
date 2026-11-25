import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { GallerySegmentBar } from "./GallerySegmentBar";

describe("GallerySegmentBar", () => {
  it("groups the category choices by content rating and audience", async () => {
    render(<GallerySegmentBar segment="adult" onSegmentChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "作品分類 成人向" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const picker = await screen.findByRole("menu");
    const ratings = within(picker).getByRole("group", { name: "內容分級" });
    const audiences = within(picker).getByRole("group", { name: "受眾" });

    expect(within(ratings).getByRole("menuitemradio", { name: "成人向", checked: true })).toBeTruthy();
    expect(within(picker).getByRole("menuitemradio", { name: "全部作品" })).toBeTruthy();
    expect(within(ratings).getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual(["全年齡向", "成人向"]);
    expect(within(audiences).getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual(["男性向", "女性向"]);
  });

  it("sets a category independently of the Demo filter", async () => {
    const onSegmentChange = vi.fn();
    const onDemoOnlyChange = vi.fn();
    const { rerender } = render(<GallerySegmentBar segment="all" onSegmentChange={onSegmentChange} onDemoOnlyChange={onDemoOnlyChange} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "作品篩選 全部作品" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "只看有 Demo", checked: false }));
    expect(onDemoOnlyChange).toHaveBeenCalledWith(true);
    expect(onSegmentChange).not.toHaveBeenCalled();

    rerender(<GallerySegmentBar segment="all" onSegmentChange={onSegmentChange} demoOnly onDemoOnlyChange={onDemoOnlyChange} />);
    expect(screen.getByRole("button", { name: "作品篩選 有 Demo" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "只看有 Demo", checked: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "女性向" }));
    expect(onSegmentChange).toHaveBeenCalledWith("female");
    expect(onDemoOnlyChange).toHaveBeenCalledOnce();

    rerender(<GallerySegmentBar segment="female" onSegmentChange={onSegmentChange} demoOnly onDemoOnlyChange={onDemoOnlyChange} />);
    expect(screen.getByRole("button", { name: "作品篩選 女性向 · 有 Demo" })).toHaveAttribute("aria-expanded", "false");
  });
});
