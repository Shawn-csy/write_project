import React from "react";
import { describe, it, expect, vi } from "vitest";
import { createRoutesFromChildren } from "react-router-dom";
import { renderWorkspaceRoutes } from "./WorkspaceRoutes";

function makeProps() {
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
    navProps: {},
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
  };
}

describe("renderWorkspaceRoutes", () => {
  it("returns valid Route children for <Routes>", () => {
    const routeChildren = renderWorkspaceRoutes(makeProps());
    expect(() => createRoutesFromChildren(routeChildren)).not.toThrow();
  });
});
