import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { WriteTab } from "./WriteTab";

const managerMock = {
  currentPath: "/",
  visibleItems: [],
  scripts: [],
  expandedPaths: new Set(),
  activeDragId: null,
  markerThemes: [],
  sensors: [],
  loading: false,
  newType: "script",
  newTitle: "",
  isCreateOpen: false,
  isRenameOpen: false,
  isDeleteOpen: false,
  isMoveOpen: false,
  creating: false,
  renaming: false,
  deleting: false,
  moving: false,
  renameType: "script",
  oldRenameTitle: "",
  renameTitle: "",
  deleteItem: null,
  moveItem: null,
  moveTargetFolder: "/",
  fetchScripts: vi.fn(),
  setScripts: vi.fn(),
  setNewType: vi.fn(),
  setIsCreateOpen: vi.fn(),
  setNewTitle: vi.fn(),
  handleCreate: vi.fn(),
  setIsRenameOpen: vi.fn(),
  setRenameTitle: vi.fn(),
  handleRename: vi.fn(),
  setIsDeleteOpen: vi.fn(),
  handleDeleteConfirm: vi.fn(),
  setIsMoveOpen: vi.fn(),
  setMoveTargetFolder: vi.fn(),
  handleMoveConfirm: vi.fn(),
  goUp: vi.fn(),
  navigateTo: vi.fn(),
  toggleExpand: vi.fn(),
  openDeleteDialog: vi.fn(),
  openMoveDialog: vi.fn(),
  handleTogglePublic: vi.fn(),
  openRenameDialog: vi.fn(),
  handleDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
};

vi.mock("../../hooks/useWriteTab", () => ({
  useWriteTab: () => managerMock,
}));

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key, fallback = "") => fallback || key,
  }),
}));

vi.mock("./write/ScriptToolbar", () => ({
  ScriptToolbar: () => <div data-testid="script-toolbar" />,
}));

vi.mock("./write/ScriptList", () => ({
  ScriptList: () => <div data-testid="script-list" />,
}));

vi.mock("./write/CreateScriptDialog", () => ({
  CreateScriptDialog: ({ open }) => <div data-testid="create-dialog">{String(open)}</div>,
}));

vi.mock("./write/RenameScriptDialog", () => ({
  RenameScriptDialog: () => null,
}));

vi.mock("./write/DeleteScriptDialog", () => ({
  DeleteScriptDialog: () => null,
}));

vi.mock("./write/MoveScriptDialog", () => ({
  MoveScriptDialog: () => null,
}));

vi.mock("./write/ImportScriptDialog", () => ({
  ImportScriptDialog: ({ open }) => <div data-testid="import-dialog">{open ? "open" : "closed"}</div>,
}));

vi.mock("../common/SpotlightGuideOverlay", () => ({
  SpotlightGuideOverlay: ({ open }) => <div data-testid="guide-overlay">{open ? "open" : "closed"}</div>,
}));

vi.mock("../../lib/api/scripts", () => ({
  createScript: vi.fn(),
  updateScript: vi.fn(),
  getScript: vi.fn(),
}));

describe("WriteTab", () => {
  beforeEach(() => {
    Object.values(managerMock).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) value.mockReset();
    });
    managerMock.currentPath = "/";
    managerMock.visibleItems = [];
    managerMock.scripts = [];
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("no quote")));
  });

  it("responds to create-script global action", async () => {
    render(<WriteTab onSelectScript={vi.fn()} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("write-tab-action", { detail: { type: "create-script" } }));
    });

    await waitFor(() => {
      expect(managerMock.setNewType).toHaveBeenCalledWith("script");
      expect(managerMock.setIsCreateOpen).toHaveBeenCalledWith(true);
    });
  });

  it("opens import dialog and guide from global actions", async () => {
    render(<WriteTab onSelectScript={vi.fn()} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("write-tab-action", { detail: { type: "import-script" } }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("import-dialog")).toHaveTextContent("open");
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("write-tab-action", { detail: { type: "open-guide" } }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("guide-overlay")).toHaveTextContent("open");
    });
  });
});
