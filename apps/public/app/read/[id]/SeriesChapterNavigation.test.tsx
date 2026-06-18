/**
 * Contract tests for SeriesChapterNavigation.
 * Covers both header and footer variants.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SeriesChapterNavigation } from "./SeriesChapterNavigation";
import type { SeriesChapterNav } from "./useSeriesChapterNav";

const CH1: SeriesChapterNav["chapters"][0] = { id: "c1", title: "序章", seriesOrder: 1 };
const CH2: SeriesChapterNav["chapters"][0] = { id: "c2", title: "第二章", seriesOrder: 2 };
const CH3: SeriesChapterNav["chapters"][0] = { id: "c3", title: "最新章", seriesOrder: 3 };
const CH0: SeriesChapterNav["chapters"][0] = { id: "c0", title: "設定篇", seriesOrder: 0 };

function makeNav(overrides: Partial<SeriesChapterNav> = {}): SeriesChapterNav {
  return {
    seriesName: "黑夜系列",
    seriesHref: "/series/%E9%BB%91%E5%A4%9C%E7%B3%BB%E5%88%97",
    chapters: [CH1, CH2, CH3],
    currentIndex: 1,
    prev: CH1,
    next: CH3,
    latestChapter: null,
    isLatest: false,
    latestScriptUpdatedAt: null,
    ...overrides,
  };
}

// ── header variant ──────────────────────────────────────────────────────────

describe("SeriesChapterNavigation header variant", () => {
  it("renders series link", () => {
    render(<SeriesChapterNavigation nav={makeNav()} variant="header" />);
    const link = screen.getByRole("link", { name: "黑夜系列" });
    expect(link.getAttribute("href")).toContain("/series/");
  });

  it("renders current position label", () => {
    render(<SeriesChapterNavigation nav={makeNav()} variant="header" />);
    expect(screen.queryByText("第 2 部")).not.toBeNull();
  });

  it("seriesOrder 0 renders 設定／背景", () => {
    const nav = makeNav({ chapters: [CH0, CH1], currentIndex: 0, prev: null, next: CH1 });
    render(<SeriesChapterNavigation nav={nav} variant="header" />);
    expect(screen.queryByText("設定／背景")).not.toBeNull();
  });

  it("prev link href correct", () => {
    render(<SeriesChapterNavigation nav={makeNav()} variant="header" />);
    const link = screen.getByRole("link", { name: /上一部/ });
    expect(link.getAttribute("href")).toBe("/read/c1");
  });

  it("next link href correct", () => {
    render(<SeriesChapterNavigation nav={makeNav()} variant="header" />);
    const link = screen.getByRole("link", { name: /下一部/ });
    expect(link.getAttribute("href")).toBe("/read/c3");
  });

  it("no prev → disabled span, not link", () => {
    render(
      <SeriesChapterNavigation nav={makeNav({ prev: null })} variant="header" />
    );
    expect(screen.queryByRole("link", { name: /上一部/ })).toBeNull();
    expect(screen.queryByText(/上一部/)).not.toBeNull();
  });

  it("no next → disabled span, not link", () => {
    render(
      <SeriesChapterNavigation nav={makeNav({ next: null })} variant="header" />
    );
    expect(screen.queryByRole("link", { name: /下一部/ })).toBeNull();
    expect(screen.queryByText(/下一部/)).not.toBeNull();
  });

  it("hasNewChapter shows badge", () => {
    render(
      <SeriesChapterNavigation nav={makeNav()} variant="header" hasNewChapter />
    );
    expect(screen.queryByText("有新章節")).not.toBeNull();
  });

  it("no badge when hasNewChapter=false", () => {
    render(<SeriesChapterNavigation nav={makeNav()} variant="header" />);
    expect(screen.queryByText("有新章節")).toBeNull();
  });
});

// ── footer variant ──────────────────────────────────────────────────────────

describe("SeriesChapterNavigation footer variant", () => {
  it("renders series link", () => {
    render(<SeriesChapterNavigation nav={makeNav()} variant="footer" />);
    expect(screen.queryByText("黑夜系列")).not.toBeNull();
  });

  it("renders latest chapter link when present", () => {
    const nav = makeNav({ latestChapter: CH3, isLatest: false });
    render(<SeriesChapterNavigation nav={nav} variant="footer" />);
    expect(screen.queryByRole("link", { name: "最新章" })).not.toBeNull();
  });

  it("renders isLatest message", () => {
    render(
      <SeriesChapterNavigation
        nav={makeNav({ isLatest: true, latestChapter: null })}
        variant="footer"
      />
    );
    expect(screen.queryByText(/你正在閱讀最新章節/)).not.toBeNull();
  });

  it("hasNewChapter badge visible in footer", () => {
    render(
      <SeriesChapterNavigation nav={makeNav()} variant="footer" hasNewChapter />
    );
    expect(screen.queryByText("有新章節")).not.toBeNull();
  });
});
