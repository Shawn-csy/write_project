import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SeriesGalleryCard } from "../gallery/SeriesGalleryCard";
import { groupScriptsIntoGalleryEntries } from "../gallery/seriesModel";
import type { PublicSeriesGroup } from "../gallery/seriesModel";
import { enrichScript } from "../gallery/filterModel";
import type { GalleryScriptInput } from "../gallery/filterModel";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(overrides: Partial<GalleryScriptInput> = {}) {
  return enrichScript({
    id: "s1",
    title: "Test",
    customMetadata: [],
    licenseCommercial: "",
    licenseDerivative: "",
    licenseNotify: "",
    persona: null,
    tags: [],
    views: 0,
    lastModified: 1000,
    ...overrides,
  });
}

function makeSeries(overrides: Partial<GalleryScriptInput> = {}): PublicSeriesGroup {
  const ch1 = makeScript({ id: "c1", title: "Chapter 1", series: { name: "My Series" }, seriesOrder: 1, lastModified: 2000, ...overrides });
  const ch2 = makeScript({ id: "c2", title: "Chapter 2", series: { name: "My Series" }, seriesOrder: 2, lastModified: 1000 });
  const entries = groupScriptsIntoGalleryEntries([ch1, ch2]);
  return entries[0] as PublicSeriesGroup;
}

function assertNoNestedInteractive(container: HTMLElement) {
  const links = container.querySelectorAll("a");
  for (const link of Array.from(links)) {
    const nested = link.querySelectorAll("a, button");
    expect(nested).toHaveLength(0);
  }
  const buttons = container.querySelectorAll("button");
  for (const btn of Array.from(buttons)) {
    const nested = btn.querySelectorAll("a, button");
    expect(nested).toHaveLength(0);
  }
}

const SERIES = makeSeries();

// ─── standard variant ─────────────────────────────────────────────────────────

describe("SeriesGalleryCard — standard", () => {
  it("renders series name in heading", () => {
    render(<SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />);
    expect(screen.getByRole("heading", { name: "My Series" })).toBeDefined();
  });

  it("title link points to href", () => {
    const { container } = render(
      <SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />
    );
    const titleLink = container.querySelector("h3 a") as HTMLAnchorElement;
    expect(titleLink).not.toBeNull();
    expect(titleLink.href).toContain("/series/my-series");
  });

  it("cover link is aria-hidden and points to href", () => {
    const { container } = render(
      <SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />
    );
    const coverLink = container.querySelector("a[aria-hidden]") as HTMLAnchorElement;
    expect(coverLink).not.toBeNull();
    expect(coverLink.href).toContain("/series/my-series");
  });

  it("no nested interactive elements", () => {
    const { container } = render(
      <SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />
    );
    assertNoNestedInteractive(container);
  });

  it("showAgeGate=false renders no R-18 badge", () => {
    render(<SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" showAgeGate={false} />);
    expect(screen.queryByText(/R-18|R18/)).toBeNull();
  });

  it("showAgeGate=true renders R-18 badge", () => {
    render(<SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" showAgeGate />);
    expect(screen.getByText(/R-18/)).toBeDefined();
  });

  it("shows chapter count", () => {
    render(<SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />);
    // Chapter count appears as "2 部" in meta
    expect(screen.getByText(/2\s*部/)).toBeDefined();
  });

  it("shows summary when present", () => {
    const seriesWithSummary = {
      ...SERIES,
      summary: "A great series",
    };
    render(<SeriesGalleryCard series={seriesWithSummary} variant="standard" href="/series/my-series" />);
    expect(screen.getByText("A great series")).toBeDefined();
  });
});

// ─── compact variant ──────────────────────────────────────────────────────────

describe("SeriesGalleryCard — compact", () => {
  it("renders series name", () => {
    render(<SeriesGalleryCard series={SERIES} variant="compact" href="/series/my-series" />);
    expect(screen.getAllByText("My Series").length).toBeGreaterThan(0);
  });

  it("title link points to href", () => {
    const { container } = render(
      <SeriesGalleryCard series={SERIES} variant="compact" href="/series/my-series" />
    );
    const titleLink = container.querySelector("a[href*='/series/my-series']:not([aria-hidden])") as HTMLAnchorElement;
    expect(titleLink).not.toBeNull();
  });

  it("no nested interactive elements", () => {
    const { container } = render(
      <SeriesGalleryCard series={SERIES} variant="compact" href="/series/my-series" />
    );
    assertNoNestedInteractive(container);
  });

  it("showAgeGate=true renders R18 badge", () => {
    render(<SeriesGalleryCard series={SERIES} variant="compact" href="/series/my-series" showAgeGate />);
    expect(screen.getByText(/R18/)).toBeDefined();
  });

  it("shows latest chapter title", () => {
    render(<SeriesGalleryCard series={SERIES} variant="compact" href="/series/my-series" />);
    // latestScript is ch1 (higher lastModified)
    expect(screen.getByText(/Chapter 1/)).toBeDefined();
  });
});

// ─── root element contract ────────────────────────────────────────────────────

describe("SeriesGalleryCard — root contract", () => {
  it("root element is <article>", () => {
    const { container } = render(
      <SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />
    );
    expect(container.firstElementChild?.tagName).toBe("ARTICLE");
  });

  it("no onClick handler on article (uses href links only)", () => {
    const { container } = render(
      <SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />
    );
    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    // article should not be a link or button
    expect(article?.tagName).not.toBe("A");
    expect(article?.tagName).not.toBe("BUTTON");
  });
});
