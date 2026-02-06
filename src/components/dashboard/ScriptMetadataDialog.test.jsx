import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ScriptMetadataDialog } from "./ScriptMetadataDialog";

vi.mock("../ui/dialog", () => ({
  Dialog: ({ children }) => <div>{children}</div>,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  MouseSensor: function MouseSensor() {},
  TouchSensor: function TouchSensor() {},
  useSensor: () => ({}),
  useSensors: (...args) => args,
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  arrayMove: (arr) => arr,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

vi.mock("../../lib/db", () => ({
  getPersonas: vi.fn().mockResolvedValue([]),
  getOrganizations: vi.fn().mockResolvedValue([]),
  getUserProfile: vi.fn().mockResolvedValue(null),
  getOrganization: vi.fn().mockResolvedValue(null),
  getTags: vi.fn().mockResolvedValue([]),
  createTag: vi.fn().mockResolvedValue(null),
  addTagToScript: vi.fn().mockResolvedValue(null),
  removeTagFromScript: vi.fn().mockResolvedValue(null),
  updateScript: vi.fn().mockResolvedValue(null),
  getScript: vi.fn().mockResolvedValue({
    id: "s1",
    title: "Local Script",
    content: "Title: Local",
    isPublic: true,
    status: "Public",
  }),
  getPublicScript: vi.fn().mockResolvedValue({
    id: "s1",
    personaId: "p1",
    organizationId: "o1",
    coverUrl: "https://example.com/cover.jpg",
    markerThemeId: "mt1",
    disableCopy: true,
    tags: [{ name: "tag1", color: "red" }],
  }),
}));

vi.mock("../../services/settingsApi", () => ({
  fetchUserThemes: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: { uid: "u1" }, profile: null }),
}));

describe("ScriptMetadataDialog", () => {
  it("loads public script info for published scripts", async () => {
    const { getPublicScript } = await import("../../lib/db");
    render(
      <ScriptMetadataDialog
        open={true}
        onOpenChange={() => {}}
        scriptId="s1"
      />
    );

    await waitFor(() => {
      expect(getPublicScript).toHaveBeenCalledWith("s1");
    });
  });
});
