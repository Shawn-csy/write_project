import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enrichScript } from "@write/public-ui";
import { RandomRecommendationStrip } from "./RandomRecommendationStrip";
import type { MixedGalleryEntry } from "./recommendationModel";

const entries: MixedGalleryEntry[] = [1, 2].map((id) => ({ kind: "gallery", entry: { type: "script", script: enrichScript({ id: `s${id}`, title: `Script ${id}`, author: { id: "writer", displayName: "Writer" }, hasDemo: true }) } }));
const policies = new Map();
function setupTrack() {
  const track = screen.getByTestId("recommendation-track");
  Object.defineProperty(track, "clientWidth", { configurable: true, value: 312 });
  Array.from(track.children).forEach((child, index) => {
    Object.defineProperty(child, "offsetLeft", { configurable: true, value: index * 312 });
  });
  Object.defineProperty(track, "scrollBy", { configurable: true, value: vi.fn(({ left }) => {
    track.scrollLeft += left;
    track.dispatchEvent(new Event("scroll"));
  }) });
  fireEvent(window, new Event("resize"));
  return track;
}
const advance = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("compact random recommendations", () => {
  it("keeps card links as siblings and no semantic copies", () => {
    render(<RandomRecommendationStrip entries={entries} navigationPolicyMap={policies} onShuffle={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Script 1" })).toHaveAttribute("href", "/read/s1");
    expect(screen.getByRole("link", { name: "查看「Script 1」的 Demo" })).toHaveAttribute("href", "/demos?script=internal%3As1");
    expect(screen.getAllByRole("link", { name: "Writer" })[0]).toHaveAttribute("href", "/author/writer");
    const track = screen.getByTestId("recommendation-track");
    expect(track.querySelector("a a")).toBeNull();
    expect(track.querySelectorAll('[aria-hidden="true"] a')).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "隨機推薦" }).parentElement).toHaveClass("section-bar");
  });
  it("counts an external card click and keeps its source destination", () => {
    const beacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon });
    const external: MixedGalleryEntry = { kind: "external", item: { id: "outside", title: "Outside", sourceUrl: "https://example.com/script", status: "published" } };
    render(<RandomRecommendationStrip entries={[external]} navigationPolicyMap={policies} onShuffle={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Outside" });
    link.addEventListener("click", (event) => event.preventDefault());
    expect(link).toHaveAttribute("href", "https://example.com/script");
    expect(link).toHaveAttribute("target", "_blank");
    fireEvent.click(link);
    expect(beacon).toHaveBeenCalledWith("/api/public-external-scripts/outside/view", expect.any(Blob));
    delete (navigator as unknown as { sendBeacon?: unknown }).sendBeacon;
  });
  it("moves every six seconds without reshuffling and pauses on hover, focus and pointer", async () => {
    vi.useFakeTimers();
    const shuffle = vi.fn();
    const { rerender } = render(<RandomRecommendationStrip entries={entries} navigationPolicyMap={policies} onShuffle={shuffle} />);
    const track = setupTrack();
    await advance(6000);
    expect(track.scrollBy).toHaveBeenCalledWith({ left: 312, behavior: "smooth" });
    const position = track.scrollLeft;
    rerender(<RandomRecommendationStrip entries={[...entries]} navigationPolicyMap={policies} onShuffle={shuffle} />);
    expect(track.scrollLeft).toBe(position); // Same IDs never reset on parent/context updates.
    const section = screen.getByTestId("random-recommendation-strip");
    fireEvent.mouseEnter(section);
    await advance(12000);
    expect(track.scrollBy).toHaveBeenCalledTimes(1);
    fireEvent.mouseLeave(section);
    fireEvent.focus(screen.getByRole("link", { name: "Script 1" }));
    await advance(6000);
    expect(track.scrollBy).toHaveBeenCalledTimes(1);
    fireEvent.blur(screen.getByRole("link", { name: "Script 1" }), { relatedTarget: document.body });
    fireEvent.pointerDown(track);
    await advance(6000);
    expect(track.scrollBy).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(window);
    await advance(6000);
    expect(track.scrollBy).toHaveBeenCalledTimes(2);
    expect(shuffle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "換一批" }));
    expect(shuffle).toHaveBeenCalledOnce();
  });
  it("honors reduced-motion for autoplay and uses instant manual motion", async () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    render(<RandomRecommendationStrip entries={entries} navigationPolicyMap={policies} onShuffle={vi.fn()} />);
    const track = setupTrack();
    await advance(12000);
    expect(track.scrollBy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "下一則隨機推薦" }));
    expect(track.scrollBy).toHaveBeenCalledWith({ left: 312, behavior: "auto" });
  });
  it("pauses when hidden and settles backward/forward wraps without changing cards", async () => {
    vi.useFakeTimers();
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    render(<RandomRecommendationStrip entries={entries} navigationPolicyMap={policies} onShuffle={vi.fn()} />);
    const track = setupTrack();
    await advance(12000);
    expect(track.scrollBy).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    fireEvent.click(screen.getByRole("button", { name: "上一則隨機推薦" }));
    expect(track.scrollLeft).toBe(312);
    fireEvent(track, new Event("scrollend"));
    expect(track.scrollLeft).toBe(936);
    fireEvent.click(screen.getByRole("button", { name: "下一則隨機推薦" }));
    fireEvent(track, new Event("scrollend"));
    expect(track.scrollLeft).toBe(624);
  });
  it("handles empty and single selections without loop copies or arrows", () => {
    const { rerender, container } = render(<RandomRecommendationStrip entries={[]} navigationPolicyMap={policies} onShuffle={vi.fn()} />);
    expect(container.firstChild).toBeNull();
    rerender(<RandomRecommendationStrip entries={[entries[0]]} navigationPolicyMap={policies} onShuffle={vi.fn()} />);
    expect(screen.getByTestId("recommendation-track").children).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "下一則隨機推薦" })).toBeNull();
  });
});
