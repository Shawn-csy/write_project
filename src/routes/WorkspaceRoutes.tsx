import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Globe, SlidersHorizontal } from "lucide-react";
import { lazyWithRefreshRetry } from "../lib/lazyWithRefreshRetry";

import { renderSafeHtml } from "../lib/safeHtml";
import type { WorkspaceRoutesProps } from "../types/routes";
import type { AstNode } from "../lib/statistics/ScriptAnalyzer";

import { MainLayout } from "../components/layout/MainLayout";
import ReaderHeader from "../components/header/ReaderHeader";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { RequireAuth } from "../components/auth/RequireAuth";

const SettingsPanel = lazyWithRefreshRetry(() => import("../components/panels/SettingsPanel"), "settings-panel");
const StatisticsPanel = lazyWithRefreshRetry(
  async () => {
    const mod = await import("../components/statistics/StatisticsPanel");
    return { default: mod.StatisticsPanel };
  },
  "stats-panel"
);
const AboutPanelLazy = lazyWithRefreshRetry(() => import("../components/panels/AboutPanel"), "about-panel");
const DashboardPage = lazyWithRefreshRetry(() => import("../pages/DashboardPage"), "page-dashboard");
const CloudEditorPage = lazyWithRefreshRetry(() => import("../pages/CloudEditorPage"), "page-cloud-editor");
const PublisherDashboard = lazyWithRefreshRetry(
  async () => {
    const mod = await import("../pages/PublisherDashboard");
    return { default: mod.PublisherDashboard };
  },
  "page-studio"
);
const SuperAdminPage = lazyWithRefreshRetry(() => import("../pages/SuperAdminPage"), "page-admin");
const LoginPage = lazyWithRefreshRetry(() => import("../pages/LoginPage"), "page-login");

const routeFallback = <div className="p-8 text-center text-muted-foreground">Loading...</div>;

export function renderWorkspaceRoutes({
  scriptManager,
  nav,
  navProps,
  showStats,
  setShowStats,
  scrollProgress,
  headerTitle,
  canShare,
  isPublicReader,
  showReaderHeader,
  readerDownloadOptions,
  handleShareUrl,
  shareCopied,
  handleReturnHome,
  handleCloudTitleUpdate,
  handleCloudMarkerThemeUpdate,
  accentStyle,
  activeCloudScript,
  isCloudReadMode,
  startCrossModeGuide,
  handleReaderEdit,
  guideOverlay,
  navigate,
}: WorkspaceRoutesProps) {
  const {
    titleHtml,
    hasTitle,
    showTitle,
    setShowTitle,
    filterCharacter,
    setFilterCharacter,
    setFocusMode,
    currentSceneId,
    setCurrentSceneId,
    setScrollSceneId,
    sceneList,
    characterList,
    rawScript,
    ast,
    fileMeta,
  } = scriptManager;

  return (
    <>
      <Route
        path="/login"
        element={
          <Suspense fallback={routeFallback}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <MainLayout
            isDesktopSidebarOpen={nav.isDesktopSidebarOpen}
            setIsDesktopSidebarOpen={nav.setIsDesktopSidebarOpen}
            isMobileDrawerOpen={nav.isMobileDrawerOpen}
            setIsMobileDrawerOpen={nav.setIsMobileDrawerOpen}
            accentStyle={accentStyle}
            openAbout={nav.openAbout}
            openSettings={nav.openSettings}
            closeAbout={() => nav.setAboutOpen(false)}
            openHome={() => {
              nav.openHome();
              navigate("/dashboard");
            }}
          >
            <main className="flex-1 overflow-hidden flex flex-row h-full relative">
              <div className="flex-1 flex flex-col h-full min-w-0 relative">
                {showReaderHeader && (
                  <div>
                    <ReaderHeader
                      hasTitle={showReaderHeader && hasTitle}
                      onToggleTitle={() => setShowTitle((v: boolean) => !v)}
                      titleName={headerTitle}
                      activeFile={null}
                      fileMeta={fileMeta}
                      isSidebarOpen={nav.isDesktopSidebarOpen}
                      setSidebarOpen={nav.setSidebarOpen}
                      downloadOptions={readerDownloadOptions}
                      onShareUrl={handleShareUrl}
                      canShare={canShare}
                      shareCopied={shareCopied}
                      sceneList={sceneList}
                      currentSceneId={currentSceneId}
                      onSelectScene={(id: string) => {
                        setCurrentSceneId(id);
                        setScrollSceneId(id);
                      }}
                      characterList={characterList}
                      filterCharacter={filterCharacter}
                      setFilterCharacter={setFilterCharacter}
                      scrollProgress={scrollProgress}
                      totalLines={0}
                      onEdit={activeCloudScript && !isPublicReader ? handleReaderEdit : null}
                      onOpenGuide={isCloudReadMode ? startCrossModeGuide : undefined}
                      showReadModeHint={isCloudReadMode}
                      onBack={handleReturnHome}
                      onToggleStats={() => setShowStats(!showStats)}
                      extraActions={
                        isCloudReadMode ? null : (
                          <div className="flex items-center gap-1">
                            <LanguageSwitcher />
                            <Button variant="ghost" size="icon" onClick={() => nav.setAboutOpen(true)} title="關於">
                              <Globe className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => nav.setSettingsOpen(true)} title="設定">
                              <SlidersHorizontal className="w-5 h-5" />
                            </Button>
                          </div>
                        )
                      }
                      setFocusMode={setFocusMode}
                      onTitleChange={activeCloudScript && !isPublicReader ? handleCloudTitleUpdate : undefined}
                      onSwitchMarkerTheme={activeCloudScript && !isPublicReader ? handleCloudMarkerThemeUpdate : undefined}
                      markerConfigs={scriptManager.effectiveMarkerConfigs}
                      hiddenMarkerIds={scriptManager.hiddenMarkerIds}
                      onToggleMarker={scriptManager.toggleMarkerVisibility}
                    />
                    {!nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && hasTitle && showTitle && (
                      <Card className="border border-border border-t-0 rounded-t-none">
                        <CardContent className="p-4">
                          <div className="prose prose-sm dark:prose-invert max-w-none">{renderSafeHtml(titleHtml)}</div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {nav.aboutOpen ? (
                  <div className="absolute inset-0 z-50 flex">
                    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
                      <AboutPanelLazy accentStyle={{ accent: accentStyle?.accent }} onClose={() => nav.setAboutOpen(false)} />
                    </Suspense>
                  </div>
                ) : nav.settingsOpen ? (
                  <div className="absolute inset-0 z-50 flex">
                    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
                      <SettingsPanel onClose={() => nav.setSettingsOpen(false)} activeTab={nav.settingsTab} onTabChange={nav.setSettingsTab} />
                    </Suspense>
                  </div>
                ) : (
                  <Routes>
                    <Route
                      path="studio"
                      element={
                        <Suspense fallback={routeFallback}>
                          <PublisherDashboard
                            isSidebarOpen={nav.isDesktopSidebarOpen}
                            setSidebarOpen={nav.setIsDesktopSidebarOpen}
                            openMobileMenu={() => nav.setIsMobileDrawerOpen(true)}
                          />
                        </Suspense>
                      }
                    />
                    <Route
                      path="dashboard"
                      element={
                        <Suspense fallback={routeFallback}>
                          <DashboardPage scriptManager={scriptManager} navProps={navProps} />
                        </Suspense>
                      }
                    />
                    <Route
                      path="admin"
                      element={
                        <Suspense fallback={routeFallback}>
                          <SuperAdminPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="edit/:id"
                      element={
                        <Suspense fallback={routeFallback}>
                          <CloudEditorPage scriptManager={scriptManager} navProps={navProps} />
                        </Suspense>
                      }
                    />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                )}
              </div>

              {showStats && showReaderHeader && (
                <div className="w-[400px] border-l border-border bg-background shrink-0 flex flex-col h-full shadow-xl z-20 transition-all duration-300">
                  <div className="h-12 border-b flex items-center px-4 shrink-0 bg-muted/20 gap-3">
                    <button onClick={() => setShowStats(false)} className="text-muted-foreground hover:text-foreground text-sm">
                      ✕
                    </button>
                    <h3 className="font-semibold text-sm">統計分析面板</h3>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <Suspense fallback={routeFallback}>
                      <StatisticsPanel
                        rawScript={rawScript}
                        scriptAst={ast as AstNode | null}
                        onLocateText={navProps.handleLocateText ?? navProps.onLocateText}
                      />
                    </Suspense>
                  </div>
                </div>
              )}
            </main>
            {guideOverlay}
          </MainLayout>
          </RequireAuth>
        }
      />
    </>
  );
}
