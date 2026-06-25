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
  it("renders nothing when no slides provided (default behavior — no fallback)", () => {
    const { container } = render(<PublicHeroMarquee />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for empty slides array (no fallback)", () => {
    const { container } = render(<PublicHeroMarquee slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for empty slides when fallbackToDefault=false (explicit)", () => {
    const { container } = render(
      <PublicHeroMarquee slides={[]} fallbackToDefault={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dev placeholder slides when fallbackToDefault=true (dev/Storybook only)", () => {
    render(<PublicHeroMarquee slides={[]} fallbackToDefault={true} />);
    expect(screen.getByRole("region")).toBeTruthy();
  });

  it("renders prev/next buttons when multiple slides", () => {
    render(<PublicHeroMarquee slides={slides} fallbackToDefault={false} />);
    expect(screen.getByLabelText("上一張")).toBeTruthy();
    expect(screen.getByLabelText("下一張")).toBeTruthy();
  });

  it("hides prev/next/dots when only one slide", () => {
    render(<PublicHeroMarquee slides={[slides[0]]} fallbackToDefault={false} />);
    expect(screen.queryByLabelText("上一張")).toBeNull();
    expect(screen.queryByLabelText("下一張")).toBeNull();
    expect(screen.queryByLabelText("切換到第 1 張")).toBeNull();
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

describe("PublicHeroMarquee — renderImage slot", () => {
  const imageSlide = {
    id: "img1",
    title: "Banner",
    image: { url: "/media/hero.webp", alt: "Hero alt" },
  };

  it("calls renderImage when slide has image and renderImage is provided", () => {
    const renderImage = vi.fn(() => <img src="/media/hero.webp" alt="custom" />);
    render(
      <PublicHeroMarquee
        slides={[imageSlide]}
        renderImage={renderImage}
      />
    );
    expect(renderImage).toHaveBeenCalledOnce();
    expect(renderImage).toHaveBeenCalledWith(
      imageSlide.image,
      imageSlide,
      0
    );
  });

  it("wraps injected image renderer in a clipping fill container", () => {
    render(
      <PublicHeroMarquee
        slides={[imageSlide]}
        renderImage={() => <div data-testid="hero-renderer" />}
      />
    );
    const wrapper = screen.getByTestId("hero-renderer").parentElement;
    expect(wrapper?.className).toContain("absolute");
    expect(wrapper?.className).toContain("inset-0");
    expect(wrapper?.className).toContain("overflow-hidden");
  });

  it("falls back to plain <img> when renderImage is not provided", () => {
    render(<PublicHeroMarquee slides={[imageSlide]} />);
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain("/media/hero.webp");
  });

  it("falls back to plain <img> using image.alt when available", () => {
    render(<PublicHeroMarquee slides={[imageSlide]} />);
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img.alt).toBe("Hero alt");
  });

  it("falls back to slide.title as alt when image.alt is absent", () => {
    const slide = { id: "i2", title: "My Slide", image: { url: "/media/b.webp" } };
    render(<PublicHeroMarquee slides={[slide]} />);
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img.alt).toBe("My Slide");
  });

  it("uses legacy imageUrl as plain <img> fallback when image is absent", () => {
    const legacySlide = { id: "l1", title: "Legacy", imageUrl: "/media/legacy.webp" };
    render(<PublicHeroMarquee slides={[legacySlide]} />);
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img.src).toContain("/media/legacy.webp");
  });

  it("does not call renderImage when slide has no image (text-only slide)", () => {
    const renderImage = vi.fn(() => null);
    render(
      <PublicHeroMarquee
        slides={[{ id: "t1", title: "Text only" }]}
        renderImage={renderImage}
      />
    );
    expect(renderImage).not.toHaveBeenCalled();
  });
});

describe("PublicHeroMarquee — renderSlideContent slot", () => {
  const textSlide = { id: "t1", title: "Text Slide", subtitle: "Body copy" };
  const brandSlide = { id: "brand-intro", type: "brand" } as { id: string; type: string };

  it("calls renderSlideContent for each slide", () => {
    const renderSlideContent = vi.fn((_slide, _index, defaultContent) => defaultContent);
    render(
      <PublicHeroMarquee
        slides={[textSlide]}
        renderSlideContent={renderSlideContent}
        fallbackToDefault={false}
      />
    );
    expect(renderSlideContent).toHaveBeenCalledOnce();
    expect(renderSlideContent).toHaveBeenCalledWith(textSlide, 0, expect.anything());
  });

  it("renders custom content returned by renderSlideContent", () => {
    render(
      <PublicHeroMarquee
        slides={[brandSlide as never]}
        renderSlideContent={(slide) =>
          (slide as { type?: string }).type === "brand"
            ? <div data-testid="brand-content">Brand Hero</div>
            : null
        }
        fallbackToDefault={false}
      />
    );
    expect(screen.getByTestId("brand-content")).toBeTruthy();
    expect(screen.getByTestId("brand-content").textContent).toBe("Brand Hero");
  });

  it("renders defaultContent when renderSlideContent returns it unchanged", () => {
    render(
      <PublicHeroMarquee
        slides={[textSlide]}
        renderSlideContent={(_slide, _index, defaultContent) => defaultContent}
        fallbackToDefault={false}
      />
    );
    expect(screen.getByText("Text Slide")).toBeTruthy();
    expect(screen.getByText("Body copy")).toBeTruthy();
  });

  it("suppresses content when renderSlideContent returns null", () => {
    render(
      <PublicHeroMarquee
        slides={[textSlide]}
        renderSlideContent={() => null}
        fallbackToDefault={false}
      />
    );
    expect(screen.queryByText("Text Slide")).toBeNull();
  });

  it("uses default content when renderSlideContent is not provided", () => {
    render(
      <PublicHeroMarquee slides={[textSlide]} fallbackToDefault={false} />
    );
    expect(screen.getByText("Text Slide")).toBeTruthy();
  });

  it("does not auto-play when only brand slide (single slide)", () => {
    vi.useFakeTimers();
    render(
      <PublicHeroMarquee
        slides={[brandSlide as never]}
        intervalMs={100}
        renderSlideContent={() => <div data-testid="brand" />}
        fallbackToDefault={false}
      />
    );
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    vi.useRealTimers();
  });
});
