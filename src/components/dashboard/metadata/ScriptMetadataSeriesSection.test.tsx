import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScriptMetadataSeriesSection, type ScriptMetadataSeriesSectionProps } from "./ScriptMetadataSeriesSection";

function renderSection(overrides: Partial<ScriptMetadataSeriesSectionProps> = {}) {
  const props: ScriptMetadataSeriesSectionProps = {
    rowLabelClassName: "label",
    seriesExpanded: false,
    setSeriesExpanded: vi.fn(),
    seriesId: "",
    setSeriesId: vi.fn(),
    setSeriesName: vi.fn(),
    seriesOrder: "",
    setSeriesOrder: vi.fn(),
    quickSeriesName: "",
    setQuickSeriesName: vi.fn(),
    showSeriesQuickCreate: false,
    setShowSeriesQuickCreate: vi.fn(),
    focusSeriesSelect: vi.fn(),
    handleQuickCreateSeries: vi.fn(),
    isCreatingSeries: false,
    seriesOptions: [{ id: "s1", name: "第一季" }],
    ...overrides,
  };

  render(<ScriptMetadataSeriesSection {...props} />);
  return props;
}

describe("ScriptMetadataSeriesSection", () => {
  it("shows independent-work state when series is disabled", () => {
    renderSection();

    expect(screen.getByText("獨立作品")).toBeInTheDocument();
    expect(screen.getByText("目前會以獨立作品發布，不會出現在系列頁或章節導覽中。")).toBeInTheDocument();
  });

  it("enables series assignment and focuses the series selector", () => {
    const props = renderSection();

    fireEvent.click(screen.getByRole("button", { name: "加入系列" }));

    expect(props.setSeriesExpanded).toHaveBeenCalledWith(true);
    expect(props.focusSeriesSelect).toHaveBeenCalledTimes(1);
  });

  it("clears all series fields when disabling series assignment", () => {
    const props = renderSection({
      seriesExpanded: true,
      seriesId: "s1",
      seriesOrder: "2",
      quickSeriesName: "新系列",
      showSeriesQuickCreate: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "不加入系列" }));

    expect(props.setSeriesExpanded).toHaveBeenCalledWith(false);
    expect(props.setSeriesId).toHaveBeenCalledWith("");
    expect(props.setSeriesName).toHaveBeenCalledWith("");
    expect(props.setSeriesOrder).toHaveBeenCalledWith("");
    expect(props.setQuickSeriesName).toHaveBeenCalledWith("");
    expect(props.setShowSeriesQuickCreate).toHaveBeenCalledWith(false);
  });

  it("renders selected series context and updates chapter order", () => {
    const props = renderSection({
      seriesExpanded: true,
      seriesId: "s1",
      seriesOrder: "2",
    });

    expect(screen.getByText("目前系列：第一季")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "3" } });

    expect(props.setSeriesOrder).toHaveBeenCalledWith("3");
  });

  it("toggles quick create panel", () => {
    const props = renderSection({ seriesExpanded: true });

    fireEvent.click(screen.getByRole("button", { name: "建立新系列" }));

    expect(props.setShowSeriesQuickCreate).toHaveBeenCalledWith(expect.any(Function));
  });

  it("creates a series from the quick-create input with Enter", () => {
    const props = renderSection({
      seriesExpanded: true,
      showSeriesQuickCreate: true,
      quickSeriesName: "新系列",
    });

    fireEvent.keyDown(screen.getByPlaceholderText("輸入新系列名稱"), { key: "Enter" });

    expect(props.handleQuickCreateSeries).toHaveBeenCalledTimes(1);
  });

  it("does not create a series from Enter when the name is blank", () => {
    const props = renderSection({
      seriesExpanded: true,
      showSeriesQuickCreate: true,
      quickSeriesName: " ",
    });

    fireEvent.keyDown(screen.getByPlaceholderText("輸入新系列名稱"), { key: "Enter" });

    expect(props.handleQuickCreateSeries).not.toHaveBeenCalled();
  });
});
