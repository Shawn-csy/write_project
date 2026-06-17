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

vi.mock("./SeriesAttachScriptDialog", () => ({
  SeriesAttachScriptDialog: ({
    open,
    onAttachScript,
    seriesId,
    attachableScripts,
  }: {
    open: boolean;
    onAttachScript: (scriptId: string, seriesId: string, order: number | null) => void;
    seriesId: string;
    attachableScripts: { id: string; title: string }[];
  }) =>
    open ? (
      <div data-testid="attach-dialog">
        {attachableScripts.map((s) => (
          <button
            key={s.id}
            data-testid={`attach-option-${s.id}`}
            onClick={() => onAttachScript(s.id, seriesId, null)}
          >
            {s.title}
          </button>
        ))}
      </div>
    ) : null,
}));

vi.mock("../../ui/CoverPlaceholder", () => ({
  CoverPlaceholder: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../../../lib/mediaCropRef", () => ({
  getMediaCropStyle: () => ({ src: "", style: {} }),
}));

// @dnd-kit cannot run in jsdom. Stub DndContext to capture onDragEnd, and
// useSortable to return inert refs so sortable rows render normally.
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd?: (e: unknown) => void;
    }) => (
      <div data-testid="dnd-context" data-on-drag-end={String(!!onDragEnd)}>
        {children}
      </div>
    ),
    useSensor: () => ({}),
    useSensors: (...args: unknown[]) => args,
    PointerSensor: class {},
    KeyboardSensor: class {},
  };
});

vi.mock("@dnd-kit/sortable", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/sortable")>();
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: (args: { id: string }) => ({
      attributes: { "data-sortable-id": args.id },
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
    sortableKeyboardCoordinates: actual.sortableKeyboardCoordinates,
    verticalListSortingStrategy: actual.verticalListSortingStrategy,
    arrayMove: actual.arrayMove,
  };
});

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
  onBatchReorderScripts?: ReturnType<typeof vi.fn>;
  seriesScripts?: SeriesChapterRow[];
  attachableScripts?: BaseScriptApi[];
}

function renderTab({
  onReorderScript = vi.fn(),
  onAttachScript = vi.fn(),
  onDetachScript = vi.fn(),
  onBatchReorderScripts = vi.fn(),
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
      onBatchReorderScripts={onBatchReorderScripts}
      onCreateSeries={vi.fn()}
      onUpdateSeries={vi.fn()}
      onDeleteSeries={vi.fn()}
    />
  );
  return { onReorderScript, onAttachScript, onDetachScript, onBatchReorderScripts };
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

  it("shows attach button when attachableScripts are present", () => {
    renderTab({ attachableScripts: attachable });
    expect(screen.getByRole("button", { name: "加入現有作品…" })).toBeInTheDocument();
  });

  it("does not show attach button when no attachableScripts", () => {
    renderTab({ attachableScripts: [] });
    expect(screen.queryByRole("button", { name: "加入現有作品…" })).not.toBeInTheDocument();
  });

  it("opens attach dialog on button click", () => {
    renderTab({ attachableScripts: attachable });
    expect(screen.queryByTestId("attach-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "加入現有作品…" }));
    expect(screen.getByTestId("attach-dialog")).toBeInTheDocument();
  });

  it("calls onAttachScript via dialog", () => {
    const { onAttachScript } = renderTab({ attachableScripts: attachable });
    fireEvent.click(screen.getByRole("button", { name: "加入現有作品…" }));
    fireEvent.click(screen.getByTestId("attach-option-a1"));
    expect(onAttachScript).toHaveBeenCalledWith("a1", "s1", null);
  });
});

// ─── Conflict warnings ────────────────────────────────────────────────────────

describe("order conflict warning", () => {
  it("shows amber warning banner when two chapters share the same order", () => {
    renderTab({
      seriesScripts: [
        makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 2 }),
        makeRow({ id: "c2", title: "Chapter 2", seriesOrder: 2 }),
      ],
    });
    // Match the conflict banner specifically (contains "個重複章節順序")
    expect(screen.getByText(/個重複章節順序/)).toBeInTheDocument();
  });

  it("shows missing order notice when a chapter has no order", () => {
    renderTab({
      seriesScripts: [
        makeRow({ id: "c1", title: "Chapter 1", seriesOrder: null, isMissingOrder: true }),
      ],
    });
    expect(screen.getByText(/尚未設定章節順序/)).toBeInTheDocument();
  });

  it("shows no conflict banner when all orders are unique and set", () => {
    renderTab({
      seriesScripts: [
        makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 1 }),
        makeRow({ id: "c2", title: "Chapter 2", seriesOrder: 2 }),
      ],
    });
    // "個重複章節順序" only appears in the amber banner, not in the readiness list
    expect(screen.queryByText(/個重複章節順序/)).not.toBeInTheDocument();
    expect(screen.queryByText(/尚未設定章節順序/)).not.toBeInTheDocument();
  });
});

// ─── Up / down move ───────────────────────────────────────────────────────────

describe("up/down chapter move", () => {
  const twoChapters = [
    makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 1 }),
    makeRow({ id: "c2", title: "Chapter 2", seriesOrder: 2 }),
  ];

  it("calls onBatchReorderScripts with swapped orders on move down", () => {
    const { onBatchReorderScripts } = renderTab({ seriesScripts: twoChapters });
    fireEvent.click(screen.getByRole("button", { name: "Chapter 1 下移" }));
    expect(onBatchReorderScripts).toHaveBeenCalledOnce();
    const [, , targetOrders] = (onBatchReorderScripts as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(targetOrders.get("c1")).toBe(2);
    expect(targetOrders.get("c2")).toBe(1);
  });

  it("calls onBatchReorderScripts with swapped orders on move up", () => {
    const { onBatchReorderScripts } = renderTab({ seriesScripts: twoChapters });
    fireEvent.click(screen.getByRole("button", { name: "Chapter 2 上移" }));
    expect(onBatchReorderScripts).toHaveBeenCalledOnce();
    const [, , targetOrders] = (onBatchReorderScripts as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(targetOrders.get("c1")).toBe(2);
    expect(targetOrders.get("c2")).toBe(1);
  });

  it("first chapter up button is disabled", () => {
    renderTab({ seriesScripts: twoChapters });
    expect(screen.getByRole("button", { name: "Chapter 1 上移" })).toBeDisabled();
  });

  it("last chapter down button is disabled", () => {
    renderTab({ seriesScripts: twoChapters });
    expect(screen.getByRole("button", { name: "Chapter 2 下移" })).toBeDisabled();
  });

  it("move button disabled when neighbour has missing order", () => {
    renderTab({
      seriesScripts: [
        makeRow({ id: "c1", title: "Chapter 1", seriesOrder: 1 }),
        makeRow({ id: "c2", title: "Chapter 2", seriesOrder: null, isMissingOrder: true }),
      ],
    });
    expect(screen.getByRole("button", { name: "Chapter 1 下移" })).toBeDisabled();
  });

  it("all move buttons disabled when onBatchReorderScripts is not provided", () => {
    render(
      <PublisherSeriesTab
        seriesList={[SERIES]}
        selectedSeriesId="s1"
        setSelectedSeriesId={vi.fn()}
        seriesDraft={DRAFT}
        setSeriesDraft={vi.fn()}
        seriesScripts={twoChapters}
        onCreateSeries={vi.fn()}
        onUpdateSeries={vi.fn()}
        onDeleteSeries={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Chapter 1 下移" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Chapter 2 上移" })).toBeDisabled();
  });
});
