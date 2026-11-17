import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomepageBannerStrip } from "./HomepageBannerStrip";

describe("HomepageBannerStrip", () => {
  it("renders nothing without banners", () => {
    const { container } = render(<HomepageBannerStrip slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows each image banner whole and links the ones that have a link", () => {
    render(<HomepageBannerStrip slides={[
      { id: "a", title: "意見徵求", imageUrl: "/media/a.webp", link: "https://example.com/survey" },
      { id: "b", image: { url: "/media/b.webp", alt: "活動" } },
    ]} />);
    const link = screen.getByRole("link", { name: "意見徵求" });
    expect(link.getAttribute("href")).toBe("https://example.com/survey");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByAltText("活動")).toBeTruthy();
  });

  it("sizes mixed artwork by its natural ratio so adjacent slides have no empty gutters", () => {
    const { container } = render(<HomepageBannerStrip slides={[
      { id: "portrait", title: "直式", imageUrl: "/media/portrait.webp" },
      { id: "wide", title: "橫式", imageUrl: "/media/wide.webp" },
    ]} />);
    const images = screen.getAllByRole("img") as HTMLImageElement[];
    Object.defineProperties(images[0], { naturalWidth: { value: 900 }, naturalHeight: { value: 1600 } });
    Object.defineProperties(images[1], { naturalWidth: { value: 1600 }, naturalHeight: { value: 900 } });
    fireEvent.load(images[0]);
    fireEvent.load(images[1]);
    const tiles = container.querySelectorAll("[data-banner-index]");
    expect((tiles[0] as HTMLElement).style.width).toBe("90px");
    expect((tiles[1] as HTMLElement).style.width).toBe("284px");
    expect(container.querySelector("[data-testid='banner-track']")?.className).toContain("gap-0 ");
  });

  it("falls back to a text tile when a banner has no image", () => {
    render(<HomepageBannerStrip slides={[{ id: "t", title: "站務公告", content: "週末維護" }]} />);
    expect(screen.getByText("站務公告")).toBeTruthy();
    expect(screen.getByText("週末維護")).toBeTruthy();
  });

  it("skips slides with neither image nor title", () => {
    const { container } = render(<HomepageBannerStrip slides={[{ id: "empty" }]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("banner schedule and artwork compatibility", () => {
  afterEach(() => vi.useRealTimers());
  it("keeps end-date banners for the whole Taipei day and ignores legacy crop", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T15:59:59Z"));
    render(<HomepageBannerStrip slides={[
      { id: "today", title: "Today", endDate: "2026-11-16", image: { url: "/media/today.webp", crop: { cx: 0.9, cy: 0.1, zoom: 3 } } },
      { id: "future", title: "Future", startDate: "2026-11-17" },
      { id: "past", title: "Past", endDate: "2026-11-15" },
    ]} />);
    const image = screen.getByRole("img") as HTMLImageElement;
    expect(image.style.objectFit).toBe("contain");
    expect(image.style.transform).not.toContain("3");
    expect(screen.queryByText("Future")).toBeNull();
    expect(screen.queryByText("Past")).toBeNull();
  });
});
