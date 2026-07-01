import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SeriesCreateWorkspace } from "./SeriesCreateWorkspace";

vi.mock("../../ui/MediaPicker", () => ({
  MediaPicker: () => null,
}));

vi.mock("../../ui/CoverPlaceholder", () => ({
  CoverPlaceholder: ({ title }: { title: string }) => <div data-testid="cover-placeholder">{title}</div>,
}));

vi.mock("../../../lib/mediaCropRef", () => ({
  getMediaCropStyle: () => ({ src: "", style: {} }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EMPTY_DRAFT = { name: "", summary: "", coverUrl: "", coverCrop: null };

function renderWorkspace(
  draft = EMPTY_DRAFT,
  onCreateSeries = vi.fn(),
  isSaving = false
) {
  render(
    <SeriesCreateWorkspace
      seriesDraft={draft}
      setSeriesDraft={vi.fn()}
      isSaving={isSaving}
      onCreateSeries={onCreateSeries}
    />
  );
  return { onCreateSeries };
}

// ─── SeriesCreateGuide ────────────────────────────────────────────────────────

describe("create guide", () => {
  it("shows guide title", () => {
    renderWorkspace();
    expect(screen.getByText("新系列草稿")).toBeInTheDocument();
  });

  it("shows guide body text about post-create actions", () => {
    renderWorkspace();
    expect(screen.getByText(/建立後會進入系列工作區/)).toBeInTheDocument();
  });
});

// ─── Draft preview ────────────────────────────────────────────────────────────

describe("draft preview", () => {
  it("shows 草稿預覽 label", () => {
    renderWorkspace();
    expect(screen.getByText("草稿預覽")).toBeInTheDocument();
  });

  it("shows 草稿 badge", () => {
    renderWorkspace();
    expect(screen.getByText("草稿")).toBeInTheDocument();
  });

  it("shows draft name in preview", () => {
    renderWorkspace({ ...EMPTY_DRAFT, name: "銀河傳說" });
    expect(screen.getAllByText("銀河傳說").length).toBeGreaterThan(0);
  });

  it("shows draft summary in preview", () => {
    renderWorkspace({ ...EMPTY_DRAFT, summary: "一個遠古的故事" });
    const preview = screen.getByTestId("draft-preview");
    expect(preview).toHaveTextContent("一個遠古的故事");
  });

  it("shows URL placeholder text (not a real link)", () => {
    renderWorkspace();
    expect(screen.getByText("建立後會產生系列公開頁。")).toBeInTheDocument();
  });

  it("shows cover placeholder when no cover", () => {
    renderWorkspace();
    const preview = screen.getByTestId("draft-preview");
    expect(preview.querySelector("[data-testid='cover-placeholder']")).toBeInTheDocument();
  });

  it("does NOT show a real public URL link", () => {
    renderWorkspace({ ...EMPTY_DRAFT, name: "銀河傳說" });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

// ─── Create button ────────────────────────────────────────────────────────────

describe("create button", () => {
  it("disabled when name is empty", () => {
    renderWorkspace();
    expect(screen.getByRole("button", { name: "建立系列" })).toBeDisabled();
  });

  it("enabled when name is filled", () => {
    renderWorkspace({ ...EMPTY_DRAFT, name: "新系列" });
    expect(screen.getByRole("button", { name: "建立系列" })).not.toBeDisabled();
  });

  it("disabled when isSaving", () => {
    const { onCreateSeries } = renderWorkspace({ ...EMPTY_DRAFT, name: "新系列" }, vi.fn(), true);
    expect(screen.getByRole("button", { name: "建立系列" })).toBeDisabled();
    void onCreateSeries;
  });

  it("calls onCreateSeries on click", () => {
    const { onCreateSeries } = renderWorkspace({ ...EMPTY_DRAFT, name: "新系列" });
    fireEvent.click(screen.getByRole("button", { name: "建立系列" }));
    expect(onCreateSeries).toHaveBeenCalledOnce();
  });
});
