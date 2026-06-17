import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SeriesListPane } from "./SeriesListPane";

const noop = vi.fn();

function makeSeries(overrides: {
  id: string;
  name?: string;
  readinessLevel?: "ready" | "partial" | "empty";
  scriptCount?: number;
}) {
  return { scriptCount: 0, ...overrides };
}

describe("SeriesListPane search", () => {
  const list = [
    makeSeries({ id: "s1", name: "Star Voyage" }),
    makeSeries({ id: "s2", name: "Moon River" }),
    makeSeries({ id: "s3", name: "Star Wars" }),
  ];

  function renderPane() {
    render(
      <SeriesListPane
        seriesList={list}
        selectedSeriesId=""
        setSelectedSeriesId={noop}
        setSeriesDraft={noop as never}
        onStartCreate={noop}
      />
    );
  }

  it("shows all series when query is empty", () => {
    renderPane();
    expect(screen.getByText("Star Voyage")).toBeInTheDocument();
    expect(screen.getByText("Moon River")).toBeInTheDocument();
    expect(screen.getByText("Star Wars")).toBeInTheDocument();
  });

  it("filters series by name", () => {
    renderPane();
    fireEvent.change(screen.getByPlaceholderText("搜尋系列…"), { target: { value: "star" } });
    expect(screen.getByText("Star Voyage")).toBeInTheDocument();
    expect(screen.getByText("Star Wars")).toBeInTheDocument();
    expect(screen.queryByText("Moon River")).not.toBeInTheDocument();
  });

  it("shows 無符合結果 when no match", () => {
    renderPane();
    fireEvent.change(screen.getByPlaceholderText("搜尋系列…"), { target: { value: "xyz" } });
    expect(screen.getByText(/無符合結果/)).toBeInTheDocument();
  });
});

describe("SeriesListPane readiness badge", () => {
  it("shows 可公開 badge for ready level", () => {
    render(
      <SeriesListPane
        seriesList={[makeSeries({ id: "s1", name: "Ready Series", readinessLevel: "ready" })]}
        selectedSeriesId=""
        setSelectedSeriesId={noop}
        setSeriesDraft={noop as never}
        onStartCreate={noop}
      />
    );
    expect(screen.getByText("可公開")).toBeInTheDocument();
  });

  it("shows 待補齊 badge for partial level", () => {
    render(
      <SeriesListPane
        seriesList={[makeSeries({ id: "s1", name: "Partial Series", readinessLevel: "partial" })]}
        selectedSeriesId=""
        setSelectedSeriesId={noop}
        setSeriesDraft={noop as never}
        onStartCreate={noop}
      />
    );
    expect(screen.getByText("待補齊")).toBeInTheDocument();
  });

  it("shows 空系列 badge for empty level", () => {
    render(
      <SeriesListPane
        seriesList={[makeSeries({ id: "s1", name: "Empty Series", readinessLevel: "empty" })]}
        selectedSeriesId=""
        setSelectedSeriesId={noop}
        setSeriesDraft={noop as never}
        onStartCreate={noop}
      />
    );
    expect(screen.getByText("空系列")).toBeInTheDocument();
  });
});
