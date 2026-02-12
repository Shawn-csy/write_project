import React, { Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

// Pages
import DashboardPage from "./pages/DashboardPage";
import CloudEditorPage from "./pages/CloudEditorPage";
import PublicReaderPage from "./pages/PublicReaderPage";
import PublicGalleryPage from "./pages/PublicGalleryPage";
import AuthorProfilePage from "./pages/AuthorProfilePage";
import OrganizationPage from "./pages/OrganizationPage";
import { PublisherDashboard } from "./pages/PublisherDashboard";

// import LocalReaderPage from "./pages/LocalReaderPage";
import SuperAdminPage from "./pages/SuperAdminPage";

// Components
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Globe, SlidersHorizontal } from "lucide-react";
import ReaderHeader from "./components/header/ReaderHeader";
import { MainLayout } from "./components/layout/MainLayout";
import { StatisticsPanel } from "./components/statistics/StatisticsPanel";
import { RequireAuth } from "./components/auth/RequireAuth";
import { renderSafeHtml } from "./lib/safeHtml";

// Lazy Components
const SettingsPanel = React.lazy(() => import("./components/panels/SettingsPanel"));
const AboutPanelLazy = React.lazy(() => import("./components/panels/AboutPanel"));

export function AppRouter({
    scriptManager,
    nav,
    navProps, /* { nav, contentScrollRef } */
    
    // State
    searchTerm, setSearchTerm,
    showStats, setShowStats,
    scrollProgress,
    
    // Derived
    headerTitle,
    canShare,
    isPublicReader,
    showReaderHeader,
    
    // Actions
    readerDownloadOptions,
    handleShareUrl,
    shareCopied,
    handleReturnHome,
    handleCloudTitleUpdate,
    
    // Settings
    accentStyle,
    fileLabelMode,
    setFileLabelMode,
    
    // Data (often from scriptManager but passed explicitly if needed by callbacks)
    activeFile,
    activeCloudScript,
    files,
    fileTitleMap,
    fileTagsMap
}) {
    // Destructure scriptManager for usage in render
    const {
        titleHtml,
        titleName,
        titleNote,
        titleSummary,
        hasTitle,
        showTitle, setShowTitle,
        filterCharacter, setFilterCharacter, setFocusMode,
        currentSceneId, setCurrentSceneId, setScrollSceneId,
        sceneList, characterList,
        cloudScriptMode, setCloudScriptMode,
        rawScript, ast,
        fileMeta
    } = scriptManager;

    const navigate = useNavigate();

    return (
        <Routes>
            {/* Standalone Public Routes */}
            <Route path="/read/:id" element={<PublicReaderPage scriptManager={scriptManager} navProps={navProps} />} />
            <Route path="/" element={<PublicGalleryPage />} />
            <Route path="/author/:id" element={<AuthorProfilePage />} />
            <Route path="/org/:id" element={<OrganizationPage />} />
            <Route path="/org/:id" element={<OrganizationPage />} />
            {/* <Route path="/file/:name" element={<LocalReaderPage scriptManager={scriptManager} navProps={navProps} />} /> */}

            {/* Main Application Routes - Protected */}
            <Route path="/*" element={
                <RequireAuth>
                    <MainLayout
                        isDesktopSidebarOpen={nav.isDesktopSidebarOpen}
                        setIsDesktopSidebarOpen={nav.setIsDesktopSidebarOpen}
                        isMobileDrawerOpen={nav.isMobileDrawerOpen}
                        setIsMobileDrawerOpen={nav.setIsMobileDrawerOpen}
                        fileTree={{ children: [], files: [] }}
                        activeFile={null} // activeFile
                        onSelectFile={(file) => navigate("/file/" + encodeURIComponent(file.name))}
                        accentStyle={accentStyle}
                        openAbout={nav.openAbout}
                        openSettings={nav.openSettings}
                        closeAbout={() => nav.setAboutOpen(false)}
                        openHome={() => {
                            nav.openHome();
                            navigate("/dashboard");
                        }}
                        files={[]} // files
                        fileTitleMap={{}} // fileTitleMap
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        openFolders={new Set()}
                        toggleFolder={() => { }}
                        fileTagsMap={fileTagsMap}
                        fileLabelMode={fileLabelMode}
                        setFileLabelMode={setFileLabelMode}
                        sceneList={sceneList}
                        currentSceneId={currentSceneId}
                        onSelectScene={(id) => { setCurrentSceneId(id); setScrollSceneId(id); }}
                    >
                        <main className="flex-1 overflow-hidden flex flex-row h-full relative">
                            <div className="flex-1 flex flex-col h-full min-w-0 relative">
                                {showReaderHeader && (
                                    <div>
                                        <ReaderHeader
                                            hasTitle={showReaderHeader && hasTitle}
                                            onToggleTitle={() => setShowTitle((v) => !v)}
                                            titleName={headerTitle}
                                            activeFile={activeFile}
                                            fileMeta={fileMeta}
                                            isSidebarOpen={nav.isDesktopSidebarOpen}
                                            setSidebarOpen={nav.setSidebarOpen}
                                            downloadOptions={readerDownloadOptions}
                                            onShareUrl={handleShareUrl}
                                            canShare={canShare}
                                            shareCopied={shareCopied}
                                            sceneList={sceneList}
                                            currentSceneId={currentSceneId}
                                            onSelectScene={(id) => { setCurrentSceneId(id); setScrollSceneId(id); }}
                                            characterList={characterList}
                                            filterCharacter={filterCharacter}
                                            setFilterCharacter={setFilterCharacter}

                                            scrollProgress={scrollProgress}
                                            totalLines={0}
                                            onEdit={
                                                activeCloudScript && !isPublicReader
                                                    ? () => setCloudScriptMode("edit")
                                                    : null
                                            }
                                            onBack={handleReturnHome}
                                            onToggleStats={() => setShowStats(!showStats)}
                                            extraActions={
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => nav.setAboutOpen(true)} title="關於">
                                                        <Globe className="w-5 h-5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => nav.setSettingsOpen(true)} title="設定">
                                                        <SlidersHorizontal className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            }
                                            setFocusMode={setFocusMode}
                                            onTitleChange={activeCloudScript && !isPublicReader ? handleCloudTitleUpdate : undefined}

                                            // Marker Visibility Props
                                            markerConfigs={scriptManager.effectiveMarkerConfigs}
                                        />
                                        {!nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && hasTitle && showTitle && (
                                            <Card className="border border-border border-t-0 rounded-t-none">
                                                <CardContent className="p-4">
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        {renderSafeHtml(titleHtml)}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                )}

                                {nav.aboutOpen ? (
                                    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
                                        <AboutPanelLazy accentStyle={accentStyle} onClose={() => nav.setAboutOpen(false)} />
                                    </Suspense>
                                ) : nav.settingsOpen ? (
                                    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
                                        <SettingsPanel
                                            onClose={() => nav.setSettingsOpen(false)}
                                            activeTab={nav.settingsTab}
                                            onTabChange={nav.setSettingsTab}
                                        />
                                    </Suspense>
                                ) : (
                                    <Routes>
                                        <Route path="dashboard" element={<DashboardPage scriptManager={scriptManager} navProps={navProps} />} />
                                        <Route
                                            path="studio"
                                            element={
                                                <PublisherDashboard
                                                    isSidebarOpen={nav.isDesktopSidebarOpen}
                                                    setSidebarOpen={nav.setIsDesktopSidebarOpen}
                                                    openMobileMenu={() => nav.setIsMobileDrawerOpen(true)}
                                                />
                                            }
                                        />
                                        <Route path="admin" element={<SuperAdminPage />} />
                                        <Route path="edit/:id" element={<CloudEditorPage scriptManager={scriptManager} navProps={navProps} />} />
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                    </Routes>
                                )}
                            </div>

                            {/* Reader Stats Side Panel */}
                            {showStats && showReaderHeader && (
                                <div className="w-[400px] border-l border-border bg-background shrink-0 flex flex-col h-full shadow-xl z-20 transition-all duration-300">
                                    <div className="h-12 border-b flex items-center px-4 shrink-0 bg-muted/20 gap-3">
                                        <button
                                            onClick={() => setShowStats(false)}
                                            className="text-muted-foreground hover:text-foreground text-sm"
                                        >
                                            ✕
                                        </button>
                                        <h3 className="font-semibold text-sm">統計分析面板</h3>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-hidden">
                                        <StatisticsPanel rawScript={rawScript} scriptAst={ast} onLocateText={navProps.handleLocateText || navProps.onLocateText} />
                                    </div>
                                </div>
                            )}
                        </main>
                    </MainLayout>
                </RequireAuth>
            } />
        </Routes>
    );
}

export default AppRouter;
