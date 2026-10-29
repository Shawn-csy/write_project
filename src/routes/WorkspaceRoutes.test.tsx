import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes } from "react-router-dom";
import { createRoutesFromChildren } from "react-router-dom";
import { renderWorkspaceRoutes } from "./WorkspaceRoutes";

// ── heavy component mocks ──────────────────────────────────────────────────
vi.mock("../components/auth/RequireAuth", () => ({
  RequireAuth: ({ children }) => <>{children}</>,
}));

let capturedMainLayoutProps = null;
vi.mock("../components/layout/MainLayout", () => ({
  MainLayout: (props) => {
    capturedMainLayoutProps = props;
    return <div data-testid="main-layout">{props.children}</div>;
  },
}));

vi.mock("../components/header/ReaderHeader", () => ({
  default: (props) => <div data-testid="reader-header" />,
}));

vi.mock("../components/statistics/StatisticsPanel", () => ({
  StatisticsPanel: () => <div data-testid="stats-panel" />,
}));

vi.mock("../lib/safeHtml", () => ({
  renderSafeHtml: () => null,
}));

vi.mock("../lib/lazyWithRefreshRetry", () => ({
  lazyWithRefreshRetry: (factory) => React.lazy(factory),
}));

vi.mock("../components/panels/SettingsPanel", () => ({
  default: () => <div data-testid="settings-panel" />,
}));
vi.mock("../components/panels/AboutPanel", () => ({
  default: () => <div data-testid="about-panel" />,
}));
vi.mock("../pages/WorksPage", () => ({
  default: () => <div data-testid="works-page" />,
}));
vi.mock("../pages/WorkManagePage", () => ({
  default: () => <div data-testid="work-manage-page" />,
}));
vi.mock("../pages/ExternalWorksPage", () => ({
  default: () => <div data-testid="external-works-page" />,
}));
vi.mock("../pages/SeriesPage", () => ({
  default: () => <div data-testid="series-page" />,
}));
vi.mock("../pages/SettingsPage", () => ({
  default: () => <div data-testid="settings-page" />,
}));
vi.mock("../pages/MarkerSettingsPage", () => ({
  default: () => <div data-testid="marker-settings-page" />,
}));
vi.mock("../pages/CommunityWorkbenchPage", () => ({
  default: () => <div data-testid="identity-page" />,
}));
vi.mock("../pages/CloudEditorPage", () => ({
  default: () => <div data-testid="cloud-editor-page" />,
}));
vi.mock("../pages/SuperAdminPage", () => ({
  default: () => <div data-testid="super-admin-page" />,
}));

vi.mock("../components/common/LanguageSwitcher", () => ({
  LanguageSwitcher: () => null,
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
}));
vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock("lucide-react", () => ({
  Globe: () => null,
  SlidersHorizontal: () => null,
}));

// ── helper ─────────────────────────────────────────────────────────────────
function makeProps(overrides = {}) {
  const noop = vi.fn();
  return {
    scriptManager: {
      titleHtml: "",
      hasTitle: false,
      showTitle: false,
      setShowTitle: noop,
      filterCharacter: "",
      setFilterCharacter: noop,
      setFocusMode: noop,
      currentSceneId: null,
      setCurrentSceneId: noop,
      setScrollSceneId: noop,
      sceneList: [],
      characterList: [],
      rawScript: "",
      ast: null,
      fileMeta: null,
      effectiveMarkerConfigs: [],
    },
    nav: {
      isDesktopSidebarOpen: false,
      setIsDesktopSidebarOpen: noop,
      isMobileDrawerOpen: false,
      setIsMobileDrawerOpen: noop,
      openAbout: noop,
      openSettings: noop,
      setAboutOpen: noop,
      openHome: noop,
      homeOpen: false,
      aboutOpen: false,
      settingsOpen: false,
      setSettingsOpen: noop,
      settingsTab: "display",
      setSettingsTab: noop,
      setSidebarOpen: noop,
    },
    navProps: { handleLocateText: noop },
    searchTerm: "",
    setSearchTerm: noop,
    showStats: false,
    setShowStats: noop,
    scrollProgress: 0,
    headerTitle: "",
    canShare: false,
    isPublicReader: false,
    showReaderHeader: false,
    readerDownloadOptions: [],
    handleShareUrl: noop,
    shareCopied: false,
    handleReturnHome: noop,
    handleCloudTitleUpdate: noop,
    handleCloudMarkerThemeUpdate: noop,
    accentStyle: "serif",
    fileLabelMode: "title",
    setFileLabelMode: noop,
    activeFile: null,
    activeCloudScript: null,
    fileTagsMap: {},
    isCloudReadMode: false,
    startCrossModeGuide: noop,
    handleReaderEdit: noop,
    guideOverlay: null,
    navigate: noop,
    ...overrides,
  };
}

function renderRoutes(props, { path = "/dashboard" } = {}) {
  const routeEl = renderWorkspaceRoutes(props);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{routeEl}</Routes>
    </MemoryRouter>
  );
}

// ── tests ──────────────────────────────────────────────────────────────────
describe("renderWorkspaceRoutes", () => {
  beforeEach(() => {
    capturedMainLayoutProps = null;
    vi.clearAllMocks();
  });

  it("returns valid Route children for <Routes>", () => {
    const routeChildren = renderWorkspaceRoutes(makeProps());
    expect(() => createRoutesFromChildren(routeChildren)).not.toThrow();
  });

  it("renders MainLayout at any workspace path", () => {
    renderRoutes(makeProps());
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("does not render ReaderHeader when showReaderHeader is false", () => {
    renderRoutes(makeProps({ showReaderHeader: false }));
    expect(screen.queryByTestId("reader-header")).not.toBeInTheDocument();
  });

  it("renders ReaderHeader when showReaderHeader is true", () => {
    renderRoutes(makeProps({ showReaderHeader: true }));
    expect(screen.getByTestId("reader-header")).toBeInTheDocument();
  });

  it("shows stats panel when showStats and showReaderHeader are both true", async () => {
    renderRoutes(makeProps({ showStats: true, showReaderHeader: true }));
    // StatisticsPanel is lazy-loaded, so wait for the Suspense resolve.
    expect(await screen.findByTestId("stats-panel")).toBeInTheDocument();
  });

  it("does not show stats panel when showReaderHeader is false", () => {
    renderRoutes(makeProps({ showStats: true, showReaderHeader: false }));
    expect(screen.queryByTestId("stats-panel")).not.toBeInTheDocument();
  });

  it("MainLayout.closeOverlays closes the about and settings overlays", () => {
    const setAboutOpen = vi.fn();
    const setSettingsOpen = vi.fn();
    renderRoutes(makeProps({ nav: { ...makeProps().nav, setAboutOpen, setSettingsOpen } }));
    capturedMainLayoutProps.closeOverlays();
    expect(setAboutOpen).toHaveBeenCalledWith(false);
    expect(setSettingsOpen).toHaveBeenCalledWith(false);
  });

  it.each([
    ["/dashboard", "works-page"],
    ["/studio", "works-page"],
    ["/studio?tab=series", "series-page"],
    ["/studio?tab=external", "external-works-page"],
    ["/studio?tab=works&scriptId=abc&open=publish", "work-manage-page"],
    ["/community?tab=org", "identity-page"],
    ["/works/external", "external-works-page"],
    ["/works/abc", "work-manage-page"],
    ["/settings/markers", "marker-settings-page"],
    ["/unknown", "works-page"],
  ])("routes %s to the redesigned page", async (path, testId) => {
    renderRoutes(makeProps(), { path });
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it("setShowStats is called when stats close button is clicked", () => {
    const setShowStats = vi.fn();
    renderRoutes(makeProps({ showStats: true, showReaderHeader: true, setShowStats }));
    screen.getByText("✕").click();
    expect(setShowStats).toHaveBeenCalledWith(false);
  });
});
