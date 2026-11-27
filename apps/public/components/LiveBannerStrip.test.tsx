import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/readPublicBundle", () => ({ readPublicBundle: read }));
import { LiveBannerStrip } from "./LiveBannerStrip";

describe("live ad placements", () => {
  beforeEach(() => read.mockReset());
  afterEach(() => vi.useRealTimers());
  it("loads the audio placement independently and never substitutes homepage banners", async () => {
    read.mockResolvedValue({ data: { audioWorkBanner: { items: [{ id: "a", title: "Audio ad" }, { id: "h", title: "Homepage only", placement: "homepage" }] } } });
    render(<LiveBannerStrip placement="audio-works" />);
    await waitFor(() => expect(screen.getByText("Audio ad")).toBeTruthy());
    expect(read).toHaveBeenCalledWith(["audioWorkBanner"]);
    expect(screen.queryByText("Homepage only")).toBeNull();
  });
  it("keeps the default brand and image ads together after a remote refresh", async () => {
    read.mockResolvedValue({ data: { banner: { items: [{ id: "ad", title: "Remote ad", imageUrl: "/media/ad.webp" }] } } });
    render(<LiveBannerStrip placement="homepage" slides={[{ id: "old", title: "Initial ad" }]} />);
    const heading = screen.getByRole("heading", { level: 1, name: "配音、閱讀、創作公開台本" });
    expect(heading.closest('[data-testid="homepage-banner-strip"]')).toBeTruthy();
    await screen.findByRole("img", { name: "Remote ad" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const track = screen.getByTestId("homepage-banner-strip").querySelector(".snap-x")!;
    expect(track.querySelectorAll("[data-banner-index]")).toHaveLength(2);
    expect(track.querySelectorAll("[data-banner-index]")[0].contains(heading)).toBe(true);
    expect(track.querySelectorAll("[data-banner-index]")[1].querySelector("img")).toBeTruthy();
    expect(screen.queryByTestId("brand-notice")).toBeNull();
  });
  it("uses the refreshed editable brand once and keeps it first", async () => {
    read.mockResolvedValue({ data: { banner: { items: [
      { id: "ad", title: "Ad" },
      { id: "brand-intro", title: "Updated brand", eyebrow: "New eyebrow", content: "Line one\nLine two" },
    ] } } });
    render(<LiveBannerStrip placement="homepage" slides={[{ id: "brand-intro", title: "Initial brand" }]} />);
    await screen.findByRole("heading", { name: "Updated brand" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByText("Initial brand")).toBeNull();
    expect(screen.getAllByText("New eyebrow").some((node) => !node.closest('[aria-hidden="true"]'))).toBe(true);
    const track = screen.getByTestId("homepage-banner-strip").querySelector(".snap-x")!;
    expect(track.querySelector("[data-banner-index]")?.querySelector("h1")?.textContent).toBe("Updated brand");
  });
  it("respects showBrandHero before and after refresh and when toggled", async () => {
    read.mockResolvedValue({ data: { banner: { items: [
      { id: "brand-intro", title: "Hidden brand" }, { id: "ad", title: "Visible ad" },
    ] } } });
    const slides = [{ id: "brand-intro", title: "Initial brand" }];
    const { rerender } = render(<LiveBannerStrip placement="homepage" showBrandHero={false} slides={slides} />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    await screen.findByText("Visible ad");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    rerender(<LiveBannerStrip placement="homepage" showBrandHero slides={slides} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hidden brand");
  });
  it("refreshes future campaigns at Taipei midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T15:59:59Z"));
    read.mockResolvedValueOnce({ data: { demoBanner: { items: [] } } }).mockResolvedValueOnce({ data: { demoBanner: { items: [{ id: "new", title: "New day", startDate: "2026-11-17" }] } } });
    render(<LiveBannerStrip placement="demos" />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText("New day")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
    expect(read).toHaveBeenCalledTimes(2);
    expect(screen.getByText("New day")).toBeTruthy();
  });

  it("falls back to provided slides when audio-works placement has no active banners", async () => {
    read.mockResolvedValue({ data: { audioWorkBanner: { items: [] } } });
    render(
      <LiveBannerStrip
        placement="audio-works"
        fallbackSlides={[{ id: "audio-fallback-1", title: "隨機推薦音聲", imageUrl: "/media/cover.jpg", link: "https://example.com/work-1" }]}
      />,
    );
    expect(await screen.findByRole("img", { name: "隨機推薦音聲" })).toBeTruthy();
  });

  it("prefers configured audio-works banners over fallback slides", async () => {
    read.mockResolvedValue({ data: { audioWorkBanner: { items: [{ id: "real-ad", title: "正式音聲廣告", imageUrl: "/media/ad.jpg" }] } } });
    render(
      <LiveBannerStrip
        placement="audio-works"
        fallbackSlides={[{ id: "audio-fallback-1", title: "隨機推薦音聲", imageUrl: "/media/cover.jpg" }]}
      />,
    );
    expect(await screen.findByRole("img", { name: "正式音聲廣告" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "隨機推薦音聲" })).toBeNull();
  });
});
