import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeriesChapterManager } from "./SeriesChapterManager";
import { arrayMove } from "@dnd-kit/sortable";
import type { SeriesChapterRow } from "../../../lib/publisher/seriesEditorModel";

// ─── Capture onDragEnd from DndContext ────────────────────────────────────────
// The mock exposes DndContext as a div; we capture the onDragEnd prop by
// intercepting the factory and storing the last-registered handler.

let capturedOnDragEnd: ((e: { active: { id: string }; over: { id: string } | null }) => void) | null = null;

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
    }) => {
      capturedOnDragEnd = onDragEnd as typeof capturedOnDragEnd;
      return <div data-testid="dnd-context">{children}</div>;
    },
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
      attributes: {},
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

function makeRow(id: string, seriesOrder: number | null): SeriesChapterRow {
  return {
    id,
    title: `Chapter ${id}`,
    seriesOrder,
    status: "published",
    updatedAt: 0,
    isPrologue: seriesOrder === 0,
    isMissingOrder: seriesOrder === null,
  };
}

function renderManager(
  rows: SeriesChapterRow[],
  onBatchReorderScripts = vi.fn()
) {
  render(
    <SeriesChapterManager
      seriesId="s1"
      seriesScripts={rows}
      attachableScripts={[]}
      onBatchReorderScripts={onBatchReorderScripts}
    />
  );
  return { onBatchReorderScripts };
}

// ─── Drag reorder ─────────────────────────────────────────────────────────────

describe("drag reorder via handleDragEnd", () => {
  const rows = [
    makeRow("c1", 1),
    makeRow("c2", 2),
    makeRow("c3", 3),
  ];

  it("renders DndContext", () => {
    renderManager(rows);
    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
  });

  it("no-op when active === over", () => {
    const { onBatchReorderScripts } = renderManager(rows);
    capturedOnDragEnd?.({ active: { id: "c1" }, over: { id: "c1" } });
    expect(onBatchReorderScripts).not.toHaveBeenCalled();
  });

  it("no-op when over is null", () => {
    const { onBatchReorderScripts } = renderManager(rows);
    capturedOnDragEnd?.({ active: { id: "c1" }, over: null });
    expect(onBatchReorderScripts).not.toHaveBeenCalled();
  });

  it("adjacent drag down: swaps seriesOrder values of c1 and c2", () => {
    const { onBatchReorderScripts } = renderManager(rows);
    // drag c1 (index 0) onto c2 (index 1) → arrayMove([c1,c2,c3], 0, 1) = [c2,c1,c3]
    // targetOrders: c2→1 (was at index 0), c1→2 (was at index 1), c3→3 (unchanged)
    capturedOnDragEnd?.({ active: { id: "c1" }, over: { id: "c2" } });
    expect(onBatchReorderScripts).toHaveBeenCalledOnce();
    const [, , targetOrders] = (onBatchReorderScripts as ReturnType<typeof vi.fn>).mock.calls[0] as [string, SeriesChapterRow[], Map<string, number | null>];
    expect(targetOrders.get("c1")).toBe(2);
    expect(targetOrders.get("c2")).toBe(1);
    expect(targetOrders.get("c3")).toBe(3);
  });

  it("non-adjacent drag: c1 to c3 position remaps all affected orders", () => {
    const { onBatchReorderScripts } = renderManager(rows);
    // drag c1 (index 0) onto c3 (index 2) → arrayMove = [c2,c3,c1]
    // originalOrders = [1,2,3]
    // targetOrders: c2→1, c3→2, c1→3
    capturedOnDragEnd?.({ active: { id: "c1" }, over: { id: "c3" } });
    expect(onBatchReorderScripts).toHaveBeenCalledOnce();
    const [, , targetOrders] = (onBatchReorderScripts as ReturnType<typeof vi.fn>).mock.calls[0] as [string, SeriesChapterRow[], Map<string, number | null>];
    expect(targetOrders.get("c1")).toBe(3);
    expect(targetOrders.get("c2")).toBe(1);
    expect(targetOrders.get("c3")).toBe(2);
  });

  it("passes seriesId and current rows as first two arguments", () => {
    const { onBatchReorderScripts } = renderManager(rows);
    capturedOnDragEnd?.({ active: { id: "c1" }, over: { id: "c2" } });
    const [seriesId, currentRows] = (onBatchReorderScripts as ReturnType<typeof vi.fn>).mock.calls[0] as [string, SeriesChapterRow[], Map<string, number | null>];
    expect(seriesId).toBe("s1");
    expect(currentRows).toBe(rows);
  });

  it("no-op when active row has missing order", () => {
    const rowsWithNull = [makeRow("c1", null), makeRow("c2", 2), makeRow("c3", 3)];
    const { onBatchReorderScripts } = renderManager(rowsWithNull);
    capturedOnDragEnd?.({ active: { id: "c1" }, over: { id: "c2" } });
    expect(onBatchReorderScripts).not.toHaveBeenCalled();
  });

  it("no-op when over row has missing order", () => {
    const rowsWithNull = [makeRow("c1", 1), makeRow("c2", null), makeRow("c3", 3)];
    const { onBatchReorderScripts } = renderManager(rowsWithNull);
    capturedOnDragEnd?.({ active: { id: "c1" }, over: { id: "c2" } });
    expect(onBatchReorderScripts).not.toHaveBeenCalled();
  });

  it("no-op when onBatchReorderScripts is not provided", () => {
    render(
      <SeriesChapterManager
        seriesId="s1"
        seriesScripts={rows}
        attachableScripts={[]}
      />
    );
    capturedOnDragEnd?.({ active: { id: "c1" }, over: { id: "c2" } });
    // No assertion needed beyond "does not throw"; callback absence is the guard
  });
});

// ─── arrayMove remap invariant ────────────────────────────────────────────────

describe("drag remap: all orders from original array are reassigned", () => {
  it("order values are conserved (same multiset after remap)", () => {
    const rows = [makeRow("c1", 1), makeRow("c2", 5), makeRow("c3", 10)];
    const reordered = arrayMove(rows, 0, 2); // move c1 to end
    const originalOrders = rows.map((r) => r.seriesOrder);
    const targetOrders = new Map(reordered.map((r, i) => [r.id, originalOrders[i]]));
    const originalSet = rows.map((r) => r.seriesOrder).sort();
    const remappedSet = Array.from(targetOrders.values()).sort();
    expect(remappedSet).toEqual(originalSet);
  });
});
