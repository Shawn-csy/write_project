import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../ui/dialog";
import { ScriptList } from "./ScriptList";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key, fallback = "") => fallback || key,
  }),
}));

vi.mock("../FileRow", () => ({
  FileRow: ({ title, actions }) => (
    <div>
      <span>{title}</span>
      <div>{actions}</div>
    </div>
  ),
  SortableFileRow: ({ children }) => <div>{children}</div>,
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }) => <div>{children}</div>,
  closestCenter: () => null,
  DragOverlay: ({ children }) => <div>{children}</div>,
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
}));

describe("ScriptList", () => {
  it("does not crash when rerendering from loading to populated list", () => {
    const props = {
      readOnly: true,
      sortKey: "custom",
      sortDir: "desc",
      onSortChange: vi.fn(),
      currentPath: "/",
      expandedPaths: new Set(),
      activeDragId: null,
      markerThemes: [],
      onSelectScript: vi.fn(),
      onToggleExpand: vi.fn(),
      onRequestDelete: vi.fn(),
      onRequestMove: vi.fn(),
      onTogglePublic: vi.fn(),
      onRename: vi.fn(),
      onPreviewItem: vi.fn(),
      onGoUp: vi.fn(),
      selectedPreviewId: null,
      sensors: [],
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
      setScripts: vi.fn(),
    };

    const { rerender } = render(
      <ScriptList
        {...props}
        loading={true}
        visibleItems={[]}
      />
    );

    rerender(
      <ScriptList
        {...props}
        loading={false}
        visibleItems={[
          {
            id: "s1",
            type: "script",
            title: "My Script",
            folder: "/",
            isPublic: false,
            lastModified: Date.now(),
            createdAt: Date.now(),
          },
        ]}
      />
    );

    expect(screen.getByText("My Script")).toBeInTheDocument();
  });

  it("shows the shared status pill instead of an English PRIVATE label", () => {
    render(
      <ScriptList
        readOnly={false}
        sortKey="custom"
        sortDir="desc"
        currentPath="/"
        expandedPaths={new Set()}
        markerThemes={[]}
        onSelectScript={vi.fn()}
        onToggleExpand={vi.fn()}
        onGoUp={vi.fn()}
        sensors={[]}
        setScripts={vi.fn()}
        loading={false}
        visibleItems={[
          { id: "s1", type: "script", title: "Draft", folder: "/", isPublic: false, lastModified: Date.now(), createdAt: Date.now() },
          { id: "s2", type: "script", title: "Live", folder: "/", isPublic: true, lastModified: Date.now(), createdAt: Date.now() },
        ]}
      />
    );
    expect(screen.queryByText(/^private$/i)).toBeNull();
    expect(screen.queryByText(/^public$/i)).toBeNull();
    expect(screen.getAllByText("未公開").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已公開").length).toBeGreaterThan(0);
    expect(document.querySelector("select")).toBeNull();
  });

  it("renders a skeleton while loading and an actionable empty state when empty", () => {
    const base = {
      readOnly: false, sortKey: "custom", sortDir: "desc" as const, currentPath: "/", expandedPaths: new Set<string>(),
      markerThemes: [], onSelectScript: vi.fn(), onToggleExpand: vi.fn(), onGoUp: vi.fn(), sensors: [], setScripts: vi.fn(),
    };
    const { rerender } = render(<ScriptList {...base} loading={true} visibleItems={[]} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    rerender(<ScriptList {...base} loading={false} visibleItems={[]} />);
    expect(screen.getByText("此資料夾為空")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /新增台本/ })).toBeInTheDocument();
  });

  it("opens a Dialog from the row menu without the two focus traps recursing, and leaves the page clickable", async () => {
    const user = userEvent.setup();
    const item = {
      id: "s1", type: "script", title: "My Script", folder: "/",
      isPublic: false, lastModified: Date.now(), createdAt: Date.now(),
    };
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <ScriptList
            readOnly={false}
            sortKey="custom"
            sortDir="desc"
            onSortChange={vi.fn()}
            currentPath="/"
            expandedPaths={new Set()}
            activeDragId={null}
            markerThemes={[]}
            onSelectScript={vi.fn()}
            onToggleExpand={vi.fn()}
            onRequestDelete={() => setOpen(true)}
            onRequestMove={vi.fn()}
            onTogglePublic={vi.fn()}
            onRename={vi.fn()}
            onPreviewItem={vi.fn()}
            onGoUp={vi.fn()}
            selectedPreviewId={null}
            sensors={[]}
            onDragStart={vi.fn()}
            onDragEnd={vi.fn()}
            setScripts={vi.fn()}
            loading={false}
            visibleItems={[item]}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>confirm delete</DialogTitle>
              <DialogDescription>sure?</DialogDescription>
              <button onClick={() => setOpen(false)}>confirm</button>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "操作選項" }));
    await user.click(await screen.findByText("common.remove"));
    await user.click(await screen.findByText("confirm"));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

    expect(document.body.style.pointerEvents).not.toBe("none");
  });
});
