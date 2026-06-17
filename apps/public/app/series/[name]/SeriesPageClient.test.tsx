/**
 * Render contract tests for SeriesPageClient.
 *
 * Covers:
 *   - banner and header card render with cover
 *   - series title, script count, summary
 *   - "開始閱讀" CTA links to first script
 *   - "最新章節" CTA shown only when latest !== first
 *   - chapter list: title, order number, latest badge
 *   - empty state shown when no scripts
 *   - hasCover uses cover.src (no raw coverUrl leak)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SeriesPageClient } from "./SeriesPageClient";
import type { PublicScript } from "@/lib/types";

vi.mock("@write/media-crop", () => ({
  getMediaCropStyle: (src: string) => ({
    src: src || "",
    style: {},
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(overrides: Partial<PublicScript> & { id: string }): PublicScript {
  return {
    title: "Untitled",
    seriesOrder: 1,
    lastModified: Date.now(),
    ...overrides,
  } as PublicScript;
}

const META_WITH_COVER = {
  name: "女朋友",
  summary: "一段關於愛的故事",
  coverUrl: "https://example.com/cover.jpg",
  coverCrop: null,
  latestScriptId: "s2",
};

const META_NO_COVER = {
  name: "無封面系列",
  summary: "",
  coverUrl: "",
  coverCrop: null,
  latestScriptId: "s1",
};

const SCRIPTS: PublicScript[] = [
  makeScript({ id: "s1", title: "第一章", seriesOrder: 1 }),
  makeScript({ id: "s2", title: "第二章", seriesOrder: 2 }),
];

// ─── Header card ──────────────────────────────────────────────────────────────

describe("header card", () => {
  it("shows series name", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("女朋友");
  });

  it("shows script count", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    expect(screen.getByText("2 部作品")).toBeInTheDocument();
  });

  it("shows summary when present", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    expect(screen.getByText("一段關於愛的故事")).toBeInTheDocument();
  });

  it("omits summary when empty", () => {
    render(<SeriesPageClient seriesName="無封面系列" scripts={SCRIPTS} seriesMeta={META_NO_COVER} />);
    expect(screen.queryByText("一段關於愛的故事")).not.toBeInTheDocument();
  });

  it("renders cover img when cover.src is truthy", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.some((img) => img.getAttribute("src") === "https://example.com/cover.jpg")).toBe(true);
  });

  it("renders no cover img when coverUrl is empty", () => {
    render(<SeriesPageClient seriesName="無封面系列" scripts={SCRIPTS} seriesMeta={META_NO_COVER} />);
    // img with that src must not exist
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

// ─── CTA buttons ─────────────────────────────────────────────────────────────

describe("CTA buttons", () => {
  it("開始閱讀 links to first script", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    const link = screen.getByRole("link", { name: "開始閱讀" });
    expect(link).toHaveAttribute("href", "/read/s1");
  });

  it("最新章節 shown when latest !== first", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    const link = screen.getByRole("link", { name: "最新章節" });
    expect(link).toHaveAttribute("href", "/read/s2");
  });

  it("最新章節 NOT shown when latest === first", () => {
    const meta = { ...META_WITH_COVER, latestScriptId: "s1" };
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={meta} />);
    expect(screen.queryByRole("link", { name: "最新章節" })).not.toBeInTheDocument();
  });

  it("no CTA when scripts empty", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={[]} seriesMeta={META_WITH_COVER} />);
    expect(screen.queryByRole("link", { name: "開始閱讀" })).not.toBeInTheDocument();
  });
});

// ─── Chapter list ────────────────────────────────────────────────────────────

describe("chapter list", () => {
  it("renders chapter titles as links", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    expect(screen.getByRole("link", { name: /第一章/ })).toHaveAttribute("href", "/read/s1");
    expect(screen.getByRole("link", { name: /第二章/ })).toHaveAttribute("href", "/read/s2");
  });

  it("shows 最新 badge on latest script (not first)", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={SCRIPTS} seriesMeta={META_WITH_COVER} />);
    expect(screen.getByText("最新")).toBeInTheDocument();
  });

  it("does NOT show 最新 badge when only one script", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={[SCRIPTS[0]]} seriesMeta={{ ...META_WITH_COVER, latestScriptId: "s1" }} />);
    expect(screen.queryByText("最新")).not.toBeInTheDocument();
  });
});

// ─── Empty state ─────────────────────────────────────────────────────────────

describe("empty state", () => {
  it("shows empty message when no scripts", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={[]} seriesMeta={META_WITH_COVER} />);
    expect(screen.getByText("這個系列目前沒有公開作品。")).toBeInTheDocument();
  });

  it("does NOT show chapter list when empty", () => {
    render(<SeriesPageClient seriesName="女朋友" scripts={[]} seriesMeta={META_WITH_COVER} />);
    expect(screen.queryByRole("heading", { name: "章節列表" })).not.toBeInTheDocument();
  });
});
