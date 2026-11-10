import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import WorksPage from "./WorksPage";
import type { ScriptManager } from "../hooks/useScriptManager.types";

const dashboardCalls = vi.hoisted(() => vi.fn());
const scripts = [{ id: "s1", title: "Recent script", type: "script", lastModified: 1 }];

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: { uid: "u1" } }) }));
vi.mock("../components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("../hooks/publisher/usePublisherDashboardState", () => ({
  usePublisherDashboardState: (props: unknown) => {
    dashboardCalls(props);
    return {
      isWorksLoading: false, scripts, personas: [], setScripts: vi.fn(),
      refreshWorks: vi.fn(), formatDate: vi.fn(), scriptCounts: null,
      scriptsNextOffset: null, isLoadingMoreWorks: false,
      handleLoadMoreWorks: vi.fn(), handleWorksQueryChange: vi.fn(),
    };
  },
}));
vi.mock("../components/dashboard/publisher/PublisherWorksTab", () => ({
  PublisherWorksTab: () => <div>All works view</div>,
}));
vi.mock("../components/dashboard/WriteTab", () => ({
  WriteTab: ({ onScriptsLoaded, requestedAction }: { onScriptsLoaded: (items: typeof scripts) => void; requestedAction?: { id: number; type: string } | null }) => {
    useEffect(() => onScriptsLoaded(scripts), [onScriptsLoaded]);
    return <div>Folder works view {requestedAction?.type}</div>;
  },
}));

const manager = {
  setActiveCloudScript: vi.fn(), setActivePublicScriptId: vi.fn(),
  setRawScript: vi.fn(), setTitleName: vi.fn(), setCloudScriptMode: vi.fn(),
} as unknown as ScriptManager;

describe("WorksPage loading", () => {
  it("mounts only the selected view on the first visit and retains it after switching", async () => {
    dashboardCalls.mockClear();
    render(<MemoryRouter initialEntries={["/works?view=folders"]}><WorksPage scriptManager={manager} /></MemoryRouter>);
    expect(await screen.findByText("Folder works view")).toBeInTheDocument();
    expect(screen.queryByText("All works view")).not.toBeInTheDocument();
    expect(await screen.findByText("繼續寫作")).toBeInTheDocument();
    expect(dashboardCalls).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

    fireEvent.click(screen.getByRole("tab", { name: "依發布狀態" }));
    expect(await screen.findByText("All works view")).toBeInTheDocument();
    expect(dashboardCalls).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
    fireEvent.click(screen.getByRole("tab", { name: "依資料夾" }));
    await waitFor(() => expect(screen.getByText("Folder works view")).toBeInTheDocument());
  });

  it("does not mount the folder view on an initial published-status visit", async () => {
    dashboardCalls.mockClear();
    render(<MemoryRouter initialEntries={["/works"]}><WorksPage scriptManager={manager} /></MemoryRouter>);
    expect(await screen.findByText("All works view")).toBeInTheDocument();
    expect(screen.queryByText("Folder works view")).not.toBeInTheDocument();
    expect(dashboardCalls).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  });

  it("hands a create request to the folder view after switching from published status", async () => {
    render(<MemoryRouter initialEntries={["/works"]}><WorksPage scriptManager={manager} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "新增台本" }));
    expect(await screen.findByText("Folder works view create-script")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "依資料夾" })).toHaveAttribute("aria-selected", "true");
  });
});
