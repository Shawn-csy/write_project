import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomepageBannerStrip } from "./HomepageBannerStrip";

const slides = [
  { id: "brand-intro", title: "Brand", eyebrow: "Platform", content: "First line\nSecond line" },
  { id: "image", title: "Image", imageUrl: "/media/banner.webp", link: "https://example.com" },
  { id: "audio", title: "探索音聲作品", link: "/audio-works" },
];
const advance = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

// jsdom does not lay out flex tracks. Give each tile deterministic positions
// so measured navigation and wrapping can be exercised independently.
function layout(track: HTMLElement, width = 204) {
  Object.defineProperty(track, "clientWidth", { configurable: true, value: width });
  Array.from(track.children).forEach((child, index) => {
    Object.defineProperty(child, "offsetWidth", { configurable: true, value: 100 });
    Object.defineProperty(child, "offsetLeft", { configurable: true, value: index * 102 });
  });
  Object.defineProperty(track, "scrollTo", { configurable: true, value: vi.fn(({ left }) => {
    track.scrollLeft = left;
    track.dispatchEvent(new Event("scroll"));
  }) });
  fireEvent(window, new Event("resize"));
}

describe("looping banner behavior", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("autoplays every four seconds and settles from the last card to the first", async () => {
    render(<HomepageBannerStrip slides={slides} />);
    const track = screen.getByTestId("banner-track");
    layout(track);
    expect(track.scrollLeft).toBe(306);
    await advance(4000);
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 408, behavior: "smooth" });
    expect(screen.getByLabelText("第 2 張橫幅")).toHaveAttribute("aria-current", "true");
    await advance(8200);
    expect(track.scrollLeft).toBe(306);
    expect(screen.getByLabelText("第 1 張橫幅")).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /暫停|播放/ })).toBeNull();
    expect(track.querySelectorAll('[aria-hidden="true"] a, [aria-hidden="true"] h1')).toHaveLength(0);
  });

  it("wraps backwards only after scrolling settles and supports circle navigation", () => {
    render(<HomepageBannerStrip slides={slides} />);
    const track = screen.getByTestId("banner-track");
    layout(track);
    fireEvent.click(screen.getByLabelText("上一張橫幅"));
    expect(track.scrollLeft).toBe(204); // Smooth reverse motion is not cancelled.
    expect(screen.getByLabelText("第 3 張橫幅")).toHaveAttribute("aria-current", "true");
    fireEvent(track, new Event("scrollend"));
    expect(track.scrollLeft).toBe(510);
    fireEvent.click(screen.getByLabelText("下一張橫幅"));
    expect(track.scrollLeft).toBe(612);
    fireEvent(track, new Event("scrollend"));
    expect(track.scrollLeft).toBe(306);
    fireEvent.click(screen.getByLabelText("第 2 張橫幅"));
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 408, behavior: "smooth" });
  });

  it("pauses while hovered, focused, dragging, or hidden", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(<HomepageBannerStrip slides={slides} />);
    const region = screen.getByTestId("homepage-banner-strip");
    const track = screen.getByTestId("banner-track");
    layout(track);
    fireEvent.mouseEnter(region);
    await advance(8000);
    expect(track.scrollTo).not.toHaveBeenCalled();
    fireEvent.mouseLeave(region);
    fireEvent.focus(screen.getByRole("link", { name: "Image" }));
    await advance(8000);
    expect(track.scrollTo).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByRole("link", { name: "Image" }), { relatedTarget: document.body });
    fireEvent.pointerDown(track);
    await advance(8000);
    expect(track.scrollTo).not.toHaveBeenCalled();
    fireEvent.pointerUp(window);
    visibility.mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    await advance(8000);
    expect(track.scrollTo).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    await advance(4000);
    expect(track.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("honors reduced motion for autoplay and manual navigation", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    render(<HomepageBannerStrip slides={slides} />);
    const track = screen.getByTestId("banner-track");
    layout(track);
    await advance(12000);
    expect(track.scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("下一張橫幅"));
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 408, behavior: "auto" });
    expect(screen.queryByLabelText("暫停橫幅輪播")).toBeNull();
  });

  it("does not autoplay or duplicate a single card", async () => {
    render(<HomepageBannerStrip slides={[slides[0]]} />);
    const track = screen.getByTestId("banner-track");
    layout(track);
    await advance(12000);
    expect(track.scrollTo).not.toHaveBeenCalled();
    expect(track.children).toHaveLength(1);
    expect(screen.queryByLabelText("下一張橫幅")).toBeNull();
  });
});
