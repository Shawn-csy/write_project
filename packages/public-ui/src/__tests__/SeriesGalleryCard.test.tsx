import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GalleryHoverPreviewProvider } from "../gallery/GalleryHoverPreview";
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
  const ch1 = makeScript({
    id: "c1",
    title: "Chapter 1",
    series: { name: "My Series" },
    seriesOrder: 1,
    lastModified: 2000,
    author: { id: "a1", displayName: "Alice" },
    ...overrides,
  });
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
    const titleLink = container.querySelector("h2 a") as HTMLAnchorElement;
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

  it("shows primary author as a link when authorHref is provided", () => {
    render(<SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" authorHref="/author/a1" />);
    const authorLink = screen.getByRole("link", { name: "Alice" });
    expect(authorLink.getAttribute("href")).toBe("/author/a1");
  });

  it("shows primary author as plain text when authorHref is absent", () => {
    render(<SeriesGalleryCard series={SERIES} variant="standard" href="/series/my-series" />);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Alice" })).toBeNull();
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

  it("shows primary author in compact mode", () => {
    render(<SeriesGalleryCard series={SERIES} variant="compact" href="/series/my-series" authorHref="/author/a1" />);
    const authorLink = screen.getByRole("link", { name: "Alice" });
    expect(authorLink.getAttribute("href")).toBe("/author/a1");
  });
});

// ─── card summary and hover outline ──────────────────────────────────────────

describe("SeriesGalleryCard — card summary priority", () => {
  it("series summary wins over lead script synopsis", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      summary: "Series-level summary",
      leadScript: {
        ...SERIES.leadScript!,
        synopsis: "Lead synopsis should not show",
        _cardSummary: "Lead card summary should not show",
      } as typeof SERIES.leadScript,
    };
    render(<SeriesGalleryCard series={series} variant="standard" href="/series/s" />);
    expect(screen.getByText("Series-level summary")).toBeDefined();
    expect(screen.queryByText("Lead synopsis should not show")).toBeNull();
    expect(screen.queryByText("Lead card summary should not show")).toBeNull();
  });

  it("falls back to lead script _cardSummary when series summary absent", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      summary: undefined,
      leadScript: {
        ...SERIES.leadScript!,
        _cardSummary: "Lead card summary fallback",
      } as typeof SERIES.leadScript,
    };
    render(<SeriesGalleryCard series={series} variant="standard" href="/series/s" />);
    expect(screen.getByText("Lead card summary fallback")).toBeDefined();
  });

  it("falls back to lead script synopsis when series summary and _cardSummary absent", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      summary: undefined,
      leadScript: {
        ...SERIES.leadScript!,
        _cardSummary: undefined,
        synopsis: "Lead synopsis fallback",
      } as typeof SERIES.leadScript,
    };
    render(<SeriesGalleryCard series={series} variant="standard" href="/series/s" />);
    expect(screen.getByText(/Lead synopsis fallback/)).toBeDefined();
  });

  it("renders nothing for summary when all summary fields absent", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      summary: undefined,
      leadScript: {
        ...SERIES.leadScript!,
        _cardSummary: undefined,
        synopsis: undefined,
      } as typeof SERIES.leadScript,
    };
    const { container } = render(
      <SeriesGalleryCard series={series} variant="standard" href="/series/s" />
    );
    // No summary paragraph with truncated text
    const paras = container.querySelectorAll("p");
    const summaryPara = Array.from(paras).find(
      (p) => p.className.includes("line-clamp") && p.textContent && p.textContent.trim().length > 5
        && !p.textContent.includes("最新")
        && !p.textContent.includes("部")
    );
    expect(summaryPara).toBeUndefined();
  });
});

describe("SeriesGalleryCard — hover preview events (gallery-level layer)", () => {
  it("no card-internal absolute overlay when _hoverOutline present", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      leadScript: { ...SERIES.leadScript!, _hoverOutline: "Act structure outline" } as typeof SERIES.leadScript,
    };
    const { container } = render(
      <SeriesGalleryCard series={series} variant="standard" href="/series/s" />
    );
    expect(container.querySelector(".absolute.inset-x-2.bottom-2")).toBeNull();
  });

  it("no 查看大綱 button in card DOM", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      leadScript: { ...SERIES.leadScript!, _hoverOutline: "outline" } as typeof SERIES.leadScript,
    };
    render(<SeriesGalleryCard series={series} variant="standard" href="/series/s" />);
    expect(screen.queryByRole("button", { name: "查看大綱" })).toBeNull();
  });

  it("no nested interactive elements with outline", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      leadScript: { ...SERIES.leadScript!, _hoverOutline: "Outline" } as typeof SERIES.leadScript,
    };
    const { container } = render(
      <SeriesGalleryCard series={series} variant="standard" href="/series/s" />
    );
    assertNoNestedInteractive(container);
  });

  it("mouseEnter with provider shows preview with series name, author, outline", () => {
    const series: PublicSeriesGroup = {
      ...SERIES,
      leadScript: { ...SERIES.leadScript!, _hoverOutline: "Series outline content" } as typeof SERIES.leadScript,
    };
    const { container } = render(
      <GalleryHoverPreviewProvider>
        <SeriesGalleryCard series={series} variant="standard" href="/series/s" />
      </GalleryHoverPreviewProvider>
    );
    fireEvent.mouseEnter(container.querySelector("article")!, { clientX: 200, clientY: 100 });
    const layer = document.querySelector("[data-testid='gallery-hover-preview']");
    expect(layer).not.toBeNull();
    const text = layer!.textContent ?? "";
    const titleIdx = text.indexOf("My Series");
    const authorIdx = text.indexOf("Alice");
    const outlineIdx = text.indexOf("Series outline content");
    expect(titleIdx).toBeGreaterThanOrEqual(0);
    expect(authorIdx).toBeGreaterThanOrEqual(0);
    expect(titleIdx).toBeLessThan(outlineIdx);
    expect(authorIdx).toBeLessThan(outlineIdx);
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
