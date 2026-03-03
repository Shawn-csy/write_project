import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

// Pages
import DashboardPage from "./pages/DashboardPage";
import CloudEditorPage from "./pages/CloudEditorPage";
import PublicReaderPage from "./pages/PublicReaderPage";
import PublicGalleryPage from "./pages/PublicGalleryPage";
import AuthorProfilePage from "./pages/AuthorProfilePage";
import OrganizationPage from "./pages/OrganizationPage";
import PublicSeriesPage from "./pages/PublicSeriesPage";
import { PublisherDashboard } from "./pages/PublisherDashboard";
import PublicAboutPage from "./pages/PublicAboutPage";

// import LocalReaderPage from "./pages/LocalReaderPage";
import SuperAdminPage from "./pages/SuperAdminPage";

// Components
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Globe, SlidersHorizontal } from "lucide-react";
import ReaderHeader from "./components/header/ReaderHeader";
import { LanguageSwitcher } from "./components/common/LanguageSwitcher";
import { MainLayout } from "./components/layout/MainLayout";
import { StatisticsPanel } from "./components/statistics/StatisticsPanel";
import { RequireAuth } from "./components/auth/RequireAuth";
import { renderSafeHtml } from "./lib/safeHtml";
import { useI18n } from "./contexts/I18nContext";

// Lazy Components
const lazyWithRefreshRetry = (importer, key) =>
    React.lazy(async () => {
        const retryKey = `lazy-retry:${key}`;
        try {
            const loaded = await importer();
            sessionStorage.removeItem(retryKey);
            return loaded;
        } catch (error) {
            const message = String(error?.message || "");
            const isChunkLoadError =
                /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(message);
            const alreadyRetried = sessionStorage.getItem(retryKey) === "1";
            if (isChunkLoadError && !alreadyRetried) {
                sessionStorage.setItem(retryKey, "1");
                window.location.reload();
                return new Promise(() => {});
            }
            sessionStorage.removeItem(retryKey);
            throw error;
        }
    });

const SettingsPanel = lazyWithRefreshRetry(() => import("./components/panels/SettingsPanel"), "settings-panel");
const AboutPanelLazy = lazyWithRefreshRetry(() => import("./components/panels/AboutPanel"), "about-panel");

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
    const { t } = useI18n();
    const [readGuideSpotlightRect, setReadGuideSpotlightRect] = useState(null);

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
    const location = useLocation();
    const isCloudReadMode = Boolean(activeCloudScript) && cloudScriptMode === "read";
    const guideParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const isCrossModeGuideActive = guideParams.get("guide") === "1";
    const guideStep = guideParams.get("guideStep") || "";

    const navigateGuide = (mode, step = "") => {
        if (!activeCloudScript?.id) return;
        const params = new URLSearchParams();
        params.set("mode", mode);
        if (step) {
            params.set("guide", "1");
            params.set("guideStep", step);
        }
        navigate(`/edit/${activeCloudScript.id}?${params.toString()}`);
    };
    const exitGuideToRead = () => navigateGuide("read");
    const startCrossModeGuide = () => navigateGuide("read", "readIntro");
    const nextReadGuideStep = () => {
        if (guideStep === "readIntro") {
            navigateGuide("read", "readTools");
            return;
        }
        if (guideStep === "readTools") {
            navigateGuide("read", "readToEdit");
            return;
        }
        if (guideStep === "readToEdit") {
            navigateGuide("edit", "editIntro");
            return;
        }
        if (guideStep === "readFinish") {
            exitGuideToRead();
        }
    };
    const readGuideDialogOpen = isCloudReadMode && isCrossModeGuideActive && (
        guideStep === "readIntro" ||
        guideStep === "readTools" ||
        guideStep === "readToEdit" ||
        guideStep === "readFinish"
    );
    const readGuideTitle = (() => {
        if (guideStep === "readTools") return t("readerActions.crossGuideReadToolsTitle");
        if (guideStep === "readToEdit") return t("readerActions.crossGuideReadToEditTitle");
        if (guideStep === "readFinish") return t("readerActions.crossGuideFinishTitle");
        return t("readerActions.crossGuideReadIntroTitle");
    })();
    const readGuideDesc = (() => {
        if (guideStep === "readTools") return t("readerActions.crossGuideReadToolsDesc");
        if (guideStep === "readToEdit") return t("readerActions.crossGuideReadToEditDesc");
        if (guideStep === "readFinish") return t("readerActions.crossGuideFinishDesc");
        return t("readerActions.crossGuideReadIntroDesc");
    })();
    const getReadGuideTargetId = useCallback(() => {
        if (guideStep === "readIntro") return "reader-guide-header";
        if (guideStep === "readTools") return "reader-guide-tools";
        if (guideStep === "readToEdit") return "reader-guide-edit-button";
        return "";
    }, [guideStep]);
    const refreshReadGuideSpotlight = useCallback(() => {
        if (!readGuideDialogOpen) {
            setReadGuideSpotlightRect(null);
            return;
        }
        const targetId = getReadGuideTargetId();
        if (!targetId) {
            setReadGuideSpotlightRect(null);
            return;
        }
        const target = document.getElementById(targetId);
        if (!target) {
            setReadGuideSpotlightRect(null);
            return;
        }
        const rect = target.getBoundingClientRect();
        const pad = 10;
        setReadGuideSpotlightRect({
            top: Math.max(8, rect.top - pad),
            left: Math.max(8, rect.left - pad),
            width: Math.max(64, rect.width + pad * 2),
            height: Math.max(48, rect.height + pad * 2),
        });
    }, [getReadGuideTargetId, readGuideDialogOpen]);
    useEffect(() => {
        if (!readGuideDialogOpen) {
            setReadGuideSpotlightRect(null);
            return undefined;
        }
        refreshReadGuideSpotlight();
        const handleLayoutChange = () => refreshReadGuideSpotlight();
        window.addEventListener("resize", handleLayoutChange);
        window.addEventListener("scroll", handleLayoutChange, true);
        return () => {
            window.removeEventListener("resize", handleLayoutChange);
            window.removeEventListener("scroll", handleLayoutChange, true);
        };
    }, [readGuideDialogOpen, guideStep, refreshReadGuideSpotlight]);
    const handleReaderEdit = () => {
        if (!activeCloudScript || isPublicReader) return;
        navigateGuide("edit");
    };

    return (
        <Routes>
            {/* Standalone Public Routes */}
            <Route path="/read/:id" element={<PublicReaderPage scriptManager={scriptManager} navProps={navProps} />} />
            <Route path="/" element={<PublicGalleryPage />} />
            <Route path="/series/:seriesName" element={<PublicSeriesPage />} />
            <Route path="/author/:id" element={<AuthorProfilePage />} />
            <Route path="/org/:id" element={<OrganizationPage />} />
            <Route path="/about" element={<PublicAboutPage />} />
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
                                                    ? handleReaderEdit
                                                    : null
                                            }
                                            onOpenGuide={isCloudReadMode ? startCrossModeGuide : undefined}
                                            showReadModeHint={isCloudReadMode}
                                            onBack={handleReturnHome}
                                            onToggleStats={() => setShowStats(!showStats)}
                                            extraActions={
                                                isCloudReadMode
                                                    ? null
                                                    : (
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
                        {readGuideDialogOpen && typeof document !== "undefined" && createPortal(
                            <div className="fixed inset-0 z-[260] pointer-events-none">
                                {readGuideSpotlightRect ? (
                                    <>
                                        <div className="absolute left-0 top-0 bg-black/75 pointer-events-auto" style={{ width: "100%", height: readGuideSpotlightRect.top }} />
                                        <div className="absolute left-0 bg-black/75 pointer-events-auto" style={{ top: readGuideSpotlightRect.top, width: readGuideSpotlightRect.left, height: readGuideSpotlightRect.height }} />
                                        <div
                                            className="absolute right-0 bg-black/75 pointer-events-auto"
                                            style={{
                                                top: readGuideSpotlightRect.top,
                                                left: readGuideSpotlightRect.left + readGuideSpotlightRect.width,
                                                height: readGuideSpotlightRect.height,
                                            }}
                                        />
                                        <div className="absolute left-0 bg-black/75 pointer-events-auto" style={{ top: readGuideSpotlightRect.top + readGuideSpotlightRect.height, width: "100%", bottom: 0 }} />
                                        <div
                                            className="absolute rounded-xl border-2 border-primary shadow-[0_0_40px_rgba(255,255,255,0.12)] pointer-events-none"
                                            style={{
                                                top: readGuideSpotlightRect.top,
                                                left: readGuideSpotlightRect.left,
                                                width: readGuideSpotlightRect.width,
                                                height: readGuideSpotlightRect.height,
                                            }}
                                        />
                                    </>
                                ) : (
                                    <div className="absolute inset-0 bg-black/75 pointer-events-auto" />
                                )}
                                <div className="absolute right-6 bottom-6 w-[380px] max-w-[calc(100vw-3rem)] rounded-xl border bg-background p-4 shadow-2xl pointer-events-auto">
                                    <div className="text-base font-semibold">{readGuideTitle}</div>
                                    <p className="mt-1 text-sm text-muted-foreground">{readGuideDesc}</p>
                                    <div className="mt-4 flex items-center justify-between gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={exitGuideToRead}>
                                            {t("readerActions.crossGuideExit")}
                                        </Button>
                                        <Button type="button" size="sm" onClick={nextReadGuideStep}>
                                            {guideStep === "readFinish" ? t("readerActions.crossGuideDone") : t("readerActions.crossGuideNext")}
                                        </Button>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </MainLayout>
                </RequireAuth>
            } />
        </Routes>
    );
}

export default AppRouter;
