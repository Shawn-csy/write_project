import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminPageState } from "./useAdminPageState";

const api = vi.hoisted(() => ({
  getDirectoryOverviewAdmin: vi.fn(),
  getAllUsersAdmin: vi.fn(),
  getAllOrganizationsAdmin: vi.fn(),
  getAllPersonasAdmin: vi.fn(),
  getAllScriptsAdmin: vi.fn(),
  searchUsers: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: (() => {
    const currentUser = { uid: "admin" };
    const profile = { isAdmin: true };
    return () => ({ currentUser, profile });
  })(),
}));
vi.mock("../contexts/I18nContext", () => {
  const t = (key: string) => key;
  return { useI18n: () => ({ t }) };
});
vi.mock("../lib/api/admin", () => ({
  ...api,
  getScriptMetadataAdmin: vi.fn(), updateScriptMetadataAdmin: vi.fn(),
  deleteUserAdmin: vi.fn(), deleteOrganizationAdmin: vi.fn(),
  deletePersonaAdmin: vi.fn(), deleteScriptAdmin: vi.fn(),
}));

const overview = {
  users: 4, organizations: 2, personas: 3, authors: 1, scripts: 5,
  writerPersonaIds: ["writer"], ownerLabels: { owner: "Owner Name" },
};

describe("useAdminPageState directory loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDirectoryOverviewAdmin.mockResolvedValue(overview);
    api.getAllUsersAdmin.mockResolvedValue([]);
    api.getAllOrganizationsAdmin.mockResolvedValue([]);
    api.getAllPersonasAdmin.mockResolvedValue([
      { id: "writer", displayName: "Writer" },
      { id: "voice", displayName: "Voice" },
    ]);
    api.getAllScriptsAdmin.mockResolvedValue([{ id: "script", title: "A", ownerId: "owner", type: "script" }]);
  });

  it("loads the active list and overview, then switches lists without preloading others", async () => {
    const { result, rerender } = renderHook(
      ({ tab }: { tab: "scripts" | "personas" }) => useAdminPageState(true, tab),
      { initialProps: { tab: "scripts" as const } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.getDirectoryOverviewAdmin).toHaveBeenCalledTimes(1);
    expect(api.getAllScriptsAdmin).toHaveBeenCalledTimes(1);
    expect(api.getAllUsersAdmin).not.toHaveBeenCalled();
    expect(api.getAllOrganizationsAdmin).not.toHaveBeenCalled();
    expect(api.getAllPersonasAdmin).not.toHaveBeenCalled();
    expect(result.current.directoryOverview.scripts).toBe(5);
    expect(result.current.getOwnerLabel("owner")).toBe("Owner Name");

    rerender({ tab: "personas" });
    await waitFor(() => expect(api.getAllPersonasAdmin).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.authorPersonas.map((persona) => persona.id)).toEqual(["writer"]));
    expect(api.getAllScriptsAdmin).toHaveBeenCalledTimes(1);
    expect(api.getAllUsersAdmin).not.toHaveBeenCalled();
    expect(api.getAllOrganizationsAdmin).not.toHaveBeenCalled();
  });

  it("ignores an older tab response that arrives after a switch", async () => {
    let resolveOldOverview!: (value: typeof overview) => void;
    api.getDirectoryOverviewAdmin
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldOverview = resolve; }))
      .mockResolvedValueOnce(overview);
    const { result, rerender } = renderHook(
      ({ tab }: { tab: "scripts" | "personas" }) => useAdminPageState(true, tab),
      { initialProps: { tab: "scripts" as const } },
    );
    await waitFor(() => expect(api.getDirectoryOverviewAdmin).toHaveBeenCalledTimes(1));
    rerender({ tab: "personas" });
    await waitFor(() => expect(result.current.authorPersonas.map((persona) => persona.id)).toEqual(["writer"]));
    resolveOldOverview({ ...overview, writerPersonaIds: [], ownerLabels: {} });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getOwnerLabel("owner")).toBe("Owner Name");
    expect(result.current.authorPersonas.map((persona) => persona.id)).toEqual(["writer"]);
  });
});
