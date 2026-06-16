import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PublisherSeriesTab } from "./PublisherSeriesTab";
import type { SeriesChapterRow } from "../../../lib/publisher/seriesEditorModel";
import type { BaseScriptApi } from "../../../types/api";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../ui/MediaPicker", () => ({
  MediaPicker: () => null,
}));

vi.mock("../../ui/CoverPlaceholder", () => ({
  CoverPlaceholder: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../../../lib/mediaCropRef", () => ({
  getMediaCropStyle: () => ({ src: "", style: {} }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SERIES = { id: "s1", name: "Star Voyage", scriptCount: 2 };

const DRAFT = { name: "Star Voyage", summary: "", coverUrl: "", coverCrop: null };

function makeRow(overrides: Partial<SeriesChapterRow> & { id: string }): SeriesChapterRow {
  return {
    title: "Untitled",
    seriesOrder: 1,
    status: "published",
    updatedAt: 1000,
    isPrologue: false,
    isMissingOrder: false,
    ...overrides,
  };
}

function makeAttachable(overrides: Partial<BaseScriptApi> & { id: string }): BaseScriptApi {
  return { title: "Attachable Script", ...overrides } as BaseScriptApi;
}

interface TabProps {
  onReorderScript?: ReturnType<typeof vi.fn>;
  onAttachScript?: ReturnType<typeof vi.fn>;
  onDetachScript?: ReturnType<typeof vi.fn>;
  seriesScripts?: SeriesChapterRow[];
  attachableScripts?: BaseScriptApi[];
}

function renderTab({
  onReorderScript = vi.fn(),
  onAttachScript = vi.fn(),
  onDetachScript = vi.fn(),
  seriesScripts = [makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 1 })],
  attachableScripts = [],
}: TabProps = {}) {
  render(
    <PublisherSeriesTab
      seriesList={[SERIES]}
      selectedSeriesId="s1"
      setSelectedSeriesId={vi.fn()}
      seriesDraft={DRAFT}
      setSeriesDraft={vi.fn()}
      seriesScripts={seriesScripts}
      attachableScripts={attachableScripts}
      onDetachScript={onDetachScript}
      onReorderScript={onReorderScript}
      onAttachScript={onAttachScript}
      onCreateSeries={vi.fn()}
      onUpdateSeries={vi.fn()}
      onDeleteSeries={vi.fn()}
    />
  );
  return { onReorderScript, onAttachScript, onDetachScript };
}

// ─── Inline order edit ────────────────────────────────────────────────────────

describe("inline order edit", () => {
  it("calls onReorderScript with parsed integer on valid blur", () => {
    const { onReorderScript } = renderTab();
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "3" } });
    fireEvent.blur(orderInput);
    expect(onReorderScript).toHaveBeenCalledWith("c1", 3);
  });

  it("does NOT call onReorderScript when input is invalid (non-integer)", () => {
    const { onReorderScript } = renderTab();
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "abc" } });
    fireEvent.blur(orderInput);
    expect(onReorderScript).not.toHaveBeenCalled();
  });

  it("does NOT call onReorderScript when input is a float", () => {
    const { onReorderScript } = renderTab();
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "1.5" } });
    fireEvent.blur(orderInput);
    expect(onReorderScript).not.toHaveBeenCalled();
  });

  it("does NOT call onReorderScript when input is negative", () => {
    const { onReorderScript } = renderTab();
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "-1" } });
    fireEvent.blur(orderInput);
    expect(onReorderScript).not.toHaveBeenCalled();
  });

  it("calls onReorderScript with null when input is cleared", () => {
    const { onReorderScript } = renderTab();
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "" } });
    fireEvent.blur(orderInput);
    expect(onReorderScript).toHaveBeenCalledWith("c1", null);
  });

  it("does NOT call onReorderScript when value unchanged", () => {
    const { onReorderScript } = renderTab({
      seriesScripts: [makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 1 })],
    });
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "1" } });
    fireEvent.blur(orderInput);
    expect(onReorderScript).not.toHaveBeenCalled();
  });

  it("shows error text for invalid input during editing", () => {
    renderTab();
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "xyz" } });
    expect(screen.getByText(/請輸入整數/)).toBeInTheDocument();
  });

  it("accepts 0 as valid prologue order", () => {
    const { onReorderScript } = renderTab();
    const orderInput = screen.getByLabelText("Chapter 1 章節順序");
    fireEvent.change(orderInput, { target: { value: "0" } });
    fireEvent.blur(orderInput);
    expect(onReorderScript).toHaveBeenCalledWith("c1", 0);
  });
});

// ─── Attach script ────────────────────────────────────────────────────────────

describe("attach script", () => {
  const attachable = [makeAttachable({ id: "a1", title: "Free Script" })];

  it("calls onAttachScript with selected script and valid order", () => {
    const { onAttachScript } = renderTab({ attachableScripts: attachable });
    fireEvent.change(screen.getByRole("combobox", { name: "選擇作品" }), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect(onAttachScript).toHaveBeenCalledWith("a1", "s1", 2);
  });

  it("calls onAttachScript with null order when order is empty", () => {
    const { onAttachScript } = renderTab({ attachableScripts: attachable });
    fireEvent.change(screen.getByRole("combobox", { name: "選擇作品" }), { target: { value: "a1" } });
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect(onAttachScript).toHaveBeenCalledWith("a1", "s1", null);
  });

  it("does NOT call onAttachScript when order is invalid", () => {
    const { onAttachScript } = renderTab({ attachableScripts: attachable });
    fireEvent.change(screen.getByRole("combobox", { name: "選擇作品" }), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect(onAttachScript).not.toHaveBeenCalled();
  });

  it("does NOT call onAttachScript when no script selected", () => {
    const { onAttachScript } = renderTab({ attachableScripts: attachable });
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect(onAttachScript).not.toHaveBeenCalled();
  });

  it("shows error text when attach order is invalid", () => {
    renderTab({ attachableScripts: attachable });
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "1.5" } });
    expect(screen.getByText(/請輸入整數/)).toBeInTheDocument();
  });

  it("disables attach button while order is invalid", () => {
    renderTab({ attachableScripts: attachable });
    fireEvent.change(screen.getByRole("combobox", { name: "選擇作品" }), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "bad" } });
    expect(screen.getByRole("button", { name: "加入" })).toBeDisabled();
  });

  it("clears form after successful attach", () => {
    renderTab({ attachableScripts: attachable });
    const select = screen.getByRole("combobox", { name: "選擇作品" });
    const orderInput = screen.getByLabelText("章節順序");
    fireEvent.change(select, { target: { value: "a1" } });
    fireEvent.change(orderInput, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect((select as HTMLSelectElement).value).toBe("");
    expect((orderInput as HTMLInputElement).value).toBe("");
  });
});

// ─── Conflict warnings ────────────────────────────────────────────────────────

describe("order conflict warning", () => {
  it("shows amber warning when two chapters share the same order", () => {
    renderTab({
      seriesScripts: [
        makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 2 }),
        makeRow({ id: "c2", title: "Chapter 2", seriesOrder: 2 }),
      ],
    });
    expect(screen.getByText(/重複章節順序/)).toBeInTheDocument();
  });

  it("shows missing order notice when a chapter has no order", () => {
    renderTab({
      seriesScripts: [
        makeRow({ id: "c1", title: "Chapter 1", seriesOrder: null, isMissingOrder: true }),
      ],
    });
    expect(screen.getByText(/尚未設定章節順序/)).toBeInTheDocument();
  });

  it("shows no warning when all orders are unique and set", () => {
    renderTab({
      seriesScripts: [
        makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 1 }),
        makeRow({ id: "c2", title: "Chapter 2", seriesOrder: 2 }),
      ],
    });
    expect(screen.queryByText(/重複章節順序/)).not.toBeInTheDocument();
    expect(screen.queryByText(/尚未設定章節順序/)).not.toBeInTheDocument();
  });
});
