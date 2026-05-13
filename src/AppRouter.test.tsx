import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import AppRouter from "./AppRouter";
import { renderPublicRoutes } from "./routes/PublicRoutes";
import { renderWorkspaceRoutes } from "./routes/WorkspaceRoutes";

vi.mock("./contexts/I18nContext", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("./hooks/useCrossModeReadGuide", () => ({
  useCrossModeReadGuide: () => ({
    isCloudReadMode: false,
    guideStep: "readStart",
    readGuideDialogOpen: false,
    readGuideTitle: "",
    readGuideDesc: "",
    readGuideSpotlightRect: null,
    startCrossModeGuide: vi.fn(),
    exitGuideToRead: vi.fn(),
    nextReadGuideStep: vi.fn(),
    handleReaderEdit: vi.fn(),
  }),
}));

vi.mock("./routes/PublicRoutes", () => ({
  renderPublicRoutes: vi.fn(),
}));

vi.mock("./routes/WorkspaceRoutes", () => ({
  renderWorkspaceRoutes: vi.fn(),
}));

describe("AppRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderPublicRoutes.mockReturnValue(<Route path="/" element={<div>public route</div>} />);
    renderWorkspaceRoutes.mockReturnValue(<Route path="/*" element={<div>workspace route</div>} />);
  });

  it("renders route nodes without throwing Route child invariant errors", () => {
    const scriptManager = { cloudScriptMode: false };
    const nav = {
      isDesktopSidebarOpen: false,
      setIsDesktopSidebarOpen: vi.fn(),
      isMobileDrawerOpen: false,
      setIsMobileDrawerOpen: vi.fn(),
      openAbout: vi.fn(),
      openSettings: vi.fn(),
      setAboutOpen: vi.fn(),
      openHome: vi.fn(),
    };
    const navProps = {};

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRouter
          scriptManager={scriptManager}
          nav={nav}
          navProps={navProps}
          searchTerm=""
          setSearchTerm={vi.fn()}
          showStats={false}
          setShowStats={vi.fn()}
          scrollProgress={0}
          headerTitle=""
          canShare={false}
          isPublicReader={false}
          showReaderHeader={false}
          readerDownloadOptions={[]}
          handleShareUrl={vi.fn()}
          shareCopied={false}
          handleReturnHome={vi.fn()}
          handleCloudTitleUpdate={vi.fn()}
          accentStyle="serif"
          fileLabelMode="title"
          setFileLabelMode={vi.fn()}
          activeFile={null}
          activeCloudScript={null}
          fileTagsMap={{}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("public route")).toBeInTheDocument();
    expect(renderPublicRoutes).toHaveBeenCalledTimes(1);
    expect(renderWorkspaceRoutes).toHaveBeenCalledTimes(1);
  });
});
