import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RelatedSeriesSection } from "../reader/RelatedSeriesSection";
import type { RelatedSeriesScriptItem } from "../reader/RelatedSeriesSection";

const ITEMS: RelatedSeriesScriptItem[] = [
  { id: "a1", title: "First Work", seriesOrder: 1 },
  { id: "a2", title: "Second Work", seriesOrder: 2 },
];

describe("RelatedSeriesSection — href mode", () => {
  it("renders script links when scriptHref provided", () => {
    render(
      <RelatedSeriesSection
        relatedSeriesScripts={ITEMS}
        scriptHref={(id) => `/read/${id}`}
      />
    );
    expect(screen.getByRole("link", { name: /First Work/ }).getAttribute("href")).toBe("/read/a1");
    expect(screen.getByRole("link", { name: /Second Work/ }).getAttribute("href")).toBe("/read/a2");
  });

  it("series header link when seriesHref provided", () => {
    render(
      <RelatedSeriesSection
        seriesName="Epic Series"
        relatedSeriesScripts={ITEMS}
        seriesHref="/series/Epic%20Series"
      />
    );
    const link = screen.getByRole("link", { name: "查看系列全部" });
    expect(link.getAttribute("href")).toBe("/series/Epic%20Series");
  });
});

describe("RelatedSeriesSection — button mode", () => {
  it("calls onOpenRelatedScript when button clicked", async () => {
    const onOpen = vi.fn();
    render(
      <RelatedSeriesSection
        relatedSeriesScripts={ITEMS}
        onOpenRelatedScript={onOpen}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /First Work/ }));
    expect(onOpen).toHaveBeenCalledWith("a1");
  });

  it("calls onOpenSeries when series button clicked", async () => {
    const onOpenSeries = vi.fn();
    render(
      <RelatedSeriesSection
        seriesName="Epic Series"
        relatedSeriesScripts={ITEMS}
        onOpenSeries={onOpenSeries}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "查看系列全部" }));
    expect(onOpenSeries).toHaveBeenCalledWith("Epic Series");
  });
});

describe("RelatedSeriesSection — series order labels", () => {
  it("labels seriesOrder=0 as 設定/背景", () => {
    const items: RelatedSeriesScriptItem[] = [{ id: "x", title: "Setup", seriesOrder: 0 }];
    render(<RelatedSeriesSection relatedSeriesScripts={items} />);
    expect(screen.getByText("設定/背景")).toBeInTheDocument();
  });

  it("labels numeric order as 第 N 作", () => {
    const items: RelatedSeriesScriptItem[] = [{ id: "x", title: "Episode 3", seriesOrder: 3 }];
    render(<RelatedSeriesSection relatedSeriesScripts={items} />);
    expect(screen.getByText("第 3 作")).toBeInTheDocument();
  });

  it("labels non-numeric order as 番外", () => {
    const items: RelatedSeriesScriptItem[] = [{ id: "x", title: "Extra", seriesOrder: "extra" }];
    render(<RelatedSeriesSection relatedSeriesScripts={items} />);
    expect(screen.getByText("番外")).toBeInTheDocument();
  });
});
