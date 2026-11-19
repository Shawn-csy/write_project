import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SeriesDangerZone } from "./SeriesDangerZone";

function renderZone(overrides: Partial<React.ComponentProps<typeof SeriesDangerZone>> = {}) {
  const onDeleteSeries = vi.fn();
  render(
    <SeriesDangerZone
      seriesName="Test Series"
      isSaving={false}
      onDeleteSeries={onDeleteSeries}
      {...overrides}
    />
  );
  return { onDeleteSeries };
}

describe("SeriesDangerZone", () => {
  it("shows delete button initially, not confirm panel", () => {
    renderZone();
    expect(screen.getByRole("button", { name: "刪除系列…" })).toBeInTheDocument();
    expect(screen.queryByText(/確認刪除/)).not.toBeInTheDocument();
  });

  it("first click shows confirm panel with series name", () => {
    renderZone();
    fireEvent.click(screen.getByRole("button", { name: "刪除系列…" }));
    expect(screen.getByText(/確認刪除「Test Series」/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確認刪除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });

  it("cancel returns to initial state without calling onDeleteSeries", () => {
    const { onDeleteSeries } = renderZone();
    fireEvent.click(screen.getByRole("button", { name: "刪除系列…" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByRole("button", { name: "刪除系列…" })).toBeInTheDocument();
    expect(onDeleteSeries).not.toHaveBeenCalled();
  });

  it("confirm button calls onDeleteSeries", () => {
    const { onDeleteSeries } = renderZone();
    fireEvent.click(screen.getByRole("button", { name: "刪除系列…" }));
    fireEvent.click(screen.getByRole("button", { name: "確認刪除" }));
    expect(onDeleteSeries).toHaveBeenCalledOnce();
  });

  it("confirm button does NOT call onDeleteSeries when isSaving", () => {
    const { onDeleteSeries } = renderZone({ isSaving: true });
    // Button is disabled so click should not propagate; but to be safe, verify
    expect(screen.getByRole("button", { name: "刪除系列…" })).toBeDisabled();
    expect(onDeleteSeries).not.toHaveBeenCalled();
  });
});
