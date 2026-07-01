import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("SeriesListPane unsaved-change guard", () => {
  const twoSeries = [
    makeSeries({ id: "s1", name: "Star Voyage" }),
    makeSeries({ id: "s2", name: "Moon River" }),
  ];

  function renderDirty(setSelectedSeriesId = vi.fn(), setSeriesDraft = vi.fn()) {
    render(
      <SeriesListPane
        seriesList={twoSeries}
        selectedSeriesId="s1"
        setSelectedSeriesId={setSelectedSeriesId}
        setSeriesDraft={setSeriesDraft as never}
        onStartCreate={noop}
        isDirty={true}
      />
    );
    return { setSelectedSeriesId, setSeriesDraft };
  }

  beforeEach(() => { vi.clearAllMocks(); });

  it("clicking different series shows confirm banner when isDirty", () => {
    renderDirty();
    fireEvent.click(screen.getByText("Moon River"));
    expect(screen.getByText(/有未儲存的變更/)).toBeInTheDocument();
  });

  it("does NOT call setSelectedSeriesId on first click when isDirty", () => {
    const { setSelectedSeriesId } = renderDirty();
    fireEvent.click(screen.getByText("Moon River"));
    expect(setSelectedSeriesId).not.toHaveBeenCalled();
  });

  it("confirm discard calls setSelectedSeriesId with target id", () => {
    const { setSelectedSeriesId } = renderDirty();
    fireEvent.click(screen.getByText("Moon River"));
    fireEvent.click(screen.getByRole("button", { name: "捨棄變更並繼續" }));
    expect(setSelectedSeriesId).toHaveBeenCalledWith("s2");
  });

  it("cancel hides banner and keeps current selection", () => {
    const { setSelectedSeriesId } = renderDirty();
    fireEvent.click(screen.getByText("Moon River"));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText(/有未儲存的變更/)).not.toBeInTheDocument();
    expect(setSelectedSeriesId).not.toHaveBeenCalled();
  });

  it("clicking same series does not show banner", () => {
    renderDirty();
    fireEvent.click(screen.getByText("Star Voyage"));
    expect(screen.queryByText(/有未儲存的變更/)).not.toBeInTheDocument();
  });

  it("clicking different series switches immediately when not dirty", () => {
    const setSelectedSeriesId = vi.fn();
    render(
      <SeriesListPane
        seriesList={twoSeries}
        selectedSeriesId="s1"
        setSelectedSeriesId={setSelectedSeriesId}
        setSeriesDraft={vi.fn() as never}
        onStartCreate={noop}
        isDirty={false}
      />
    );
    fireEvent.click(screen.getByText("Moon River"));
    expect(setSelectedSeriesId).toHaveBeenCalledWith("s2");
    expect(screen.queryByText(/有未儲存的變更/)).not.toBeInTheDocument();
  });

  it("新增系列 button shows confirm banner when isDirty", () => {
    renderDirty();
    fireEvent.click(screen.getByRole("button", { name: "新增系列" }));
    expect(screen.getByText(/有未儲存的變更/)).toBeInTheDocument();
  });

  it("新增系列 button does NOT call onStartCreate directly when isDirty", () => {
    const onStartCreate = vi.fn();
    render(
      <SeriesListPane
        seriesList={twoSeries}
        selectedSeriesId="s1"
        setSelectedSeriesId={vi.fn()}
        setSeriesDraft={vi.fn() as never}
        onStartCreate={onStartCreate}
        isDirty={true}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "新增系列" }));
    expect(onStartCreate).not.toHaveBeenCalled();
  });

  it("confirm after 新增系列 guard calls onStartCreate", () => {
    const onStartCreate = vi.fn();
    render(
      <SeriesListPane
        seriesList={twoSeries}
        selectedSeriesId="s1"
        setSelectedSeriesId={vi.fn()}
        setSeriesDraft={vi.fn() as never}
        onStartCreate={onStartCreate}
        isDirty={true}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "新增系列" }));
    fireEvent.click(screen.getByRole("button", { name: "捨棄變更並繼續" }));
    expect(onStartCreate).toHaveBeenCalledOnce();
  });

  it("新增系列 button calls onStartCreate immediately when not dirty", () => {
    const onStartCreate = vi.fn();
    render(
      <SeriesListPane
        seriesList={twoSeries}
        selectedSeriesId="s1"
        setSelectedSeriesId={vi.fn()}
        setSeriesDraft={vi.fn() as never}
        onStartCreate={onStartCreate}
        isDirty={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "新增系列" }));
    expect(onStartCreate).toHaveBeenCalledOnce();
  });
});
