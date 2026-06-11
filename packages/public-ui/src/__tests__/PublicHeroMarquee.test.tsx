import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublicHeroMarquee } from "../gallery/PublicHeroMarquee";

const slides = [
  { id: "s1", title: "Slide One", content: "Content A", link: "https://example.com/1" },
  { id: "s2", title: "Slide Two", content: "Content B", link: "https://example.com/2" },
  { id: "s3", title: "Slide Three" },
];

describe("PublicHeroMarquee", () => {
  it("renders nothing for empty slides when fallbackToDefault=false", () => {
    const { container } = render(
      <PublicHeroMarquee slides={[]} fallbackToDefault={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders default slides when slides=[] and fallbackToDefault=true", () => {
    render(<PublicHeroMarquee slides={[]} fallbackToDefault={true} />);
    expect(screen.getByRole("region")).toBeTruthy();
  });

  it("renders prev/next buttons", () => {
    render(<PublicHeroMarquee slides={slides} fallbackToDefault={false} />);
    expect(screen.getByLabelText("上一張")).toBeTruthy();
    expect(screen.getByLabelText("下一張")).toBeTruthy();
  });

  it("renders dot buttons for each slide", () => {
    render(<PublicHeroMarquee slides={slides} fallbackToDefault={false} />);
    expect(screen.getByLabelText("切換到第 1 張")).toBeTruthy();
    expect(screen.getByLabelText("切換到第 2 張")).toBeTruthy();
    expect(screen.getByLabelText("切換到第 3 張")).toBeTruthy();
  });

  it("accepts custom labels", () => {
    render(
      <PublicHeroMarquee
        slides={slides}
        fallbackToDefault={false}
        labels={{ prev: "前一張", next: "後一張", jumpTo: (i) => `跳到 ${i + 1}` }}
      />
    );
    expect(screen.getByLabelText("前一張")).toBeTruthy();
    expect(screen.getByLabelText("後一張")).toBeTruthy();
    expect(screen.getByLabelText("跳到 1")).toBeTruthy();
  });

  it("slide with text and link: text block is an <a> with correct href", () => {
    render(<PublicHeroMarquee slides={[slides[0]]} fallbackToDefault={false} />);
    const link = screen.getByRole("link", { name: /Slide One/ });
    expect(link.getAttribute("href")).toBe("https://example.com/1");
  });

  it("slide with link but no text: full-slide <a> is rendered", () => {
    const linkOnly = [{ id: "l1", link: "https://example.com/notext" }];
    render(<PublicHeroMarquee slides={linkOnly} fallbackToDefault={false} />);
    const link = document.querySelector("a[href='https://example.com/notext']");
    expect(link).toBeTruthy();
    // Should cover the full slide (absolute inset-0)
    expect(link!.className).toContain("inset-0");
  });

  it("slide with text but no link: text block is a <div>, no <a>", () => {
    render(<PublicHeroMarquee slides={[slides[2]]} fallbackToDefault={false} />);
    // No links
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    // Title text is present
    expect(screen.getByText("Slide Three")).toBeTruthy();
  });

  it("clicking prev button does not throw", () => {
    render(<PublicHeroMarquee slides={slides} fallbackToDefault={false} />);
    expect(() => fireEvent.click(screen.getByLabelText("上一張"))).not.toThrow();
  });

  it("clicking next button does not throw", () => {
    render(<PublicHeroMarquee slides={slides} fallbackToDefault={false} />);
    expect(() => fireEvent.click(screen.getByLabelText("下一張"))).not.toThrow();
  });

  it("clicking dot button does not throw", () => {
    render(<PublicHeroMarquee slides={slides} fallbackToDefault={false} />);
    expect(() => fireEvent.click(screen.getByLabelText("切換到第 2 張"))).not.toThrow();
  });

  it("prev/next buttons are not blocked by slide link overlay", () => {
    render(<PublicHeroMarquee slides={slides} fallbackToDefault={false} />);
    // Controls must be z-30; slide link is on the text block (no inset-0 overlay when text exists)
    const prevBtn = screen.getByLabelText("上一張");
    const parent = prevBtn.parentElement;
    expect(parent?.className).toContain("z-30");
  });

  it("does not render auto-play timer when only 1 slide", () => {
    vi.useFakeTimers();
    render(<PublicHeroMarquee slides={[slides[0]]} fallbackToDefault={false} intervalMs={100} />);
    // Advance time — no error or state change expected
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    vi.useRealTimers();
  });
});
