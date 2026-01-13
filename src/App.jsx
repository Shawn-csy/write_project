import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSettings } from "./contexts/SettingsContext";
import { useScriptManager } from "./hooks/useScriptManager";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useFileTree } from "./hooks/useFileTree";
import { useAppShortcuts } from "./hooks/useAppShortcuts";
import { useMetaTags } from "./hooks/useMetaTags";
import { useScriptActions } from "./hooks/useScriptActions";
import { useInitialScroll } from "./hooks/useInitialScroll";

// Pages
import DashboardPage from "./pages/DashboardPage";
import CloudEditorPage from "./pages/CloudEditorPage";
import PublicReaderPage from "./pages/PublicReaderPage";
import LocalReaderPage from "./pages/LocalReaderPage";

// Components
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Globe, SlidersHorizontal } from "lucide-react";
import ReaderHeader from "./components/ReaderHeader";
import { MainLayout } from "./components/MainLayout";

const SettingsPanel = React.lazy(() => import("./components/SettingsPanel"));
const AboutPanelLazy = React.lazy(() => import("./components/AboutPanel"));

function App() {
  // 1. Contexts
  const {
      accentConfig,
      accentStyle,
      exportMode,
      fileLabelMode,
      setFileLabelMode,
      adjustFont,
      enableLocalFiles,
      markerThemes,
      setCurrentThemeId,
  } = useSettings();

  // 2. Refs (for initial params)
  const initialParamsRef = useRef({ char: null, scene: null });
  // Initialize refs from URL once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    initialParamsRef.current = {
      char: url.searchParams.get("char"),
      scene: url.searchParams.get("scene"),
    };
  }, []);

  // 5. Custom Hooks
  const scriptManager = useScriptManager(initialParamsRef);
  const nav = useAppNavigation();
  const navigate = useNavigate();

  // Destructure scriptManager for easier usage
  const { 
      files, activeFile, 
      rawScriptHtml, processedScriptHtml,
      fileMeta, fileTitleMap, fileTagsMap,
      sceneList, characterList,
      titleHtml, titleName, titleNote, titleSummary,
      hasTitle, showTitle, setShowTitle,
      filterCharacter, setFilterCharacter, setFocusMode, 
      currentSceneId, setCurrentSceneId, setScrollSceneId,
      // New additions from hook
      activeCloudScript, cloudScriptMode, setCloudScriptMode
  } = scriptManager;

  // 5. Local State mainly for UI not covered by hooks
  const [searchTerm, setSearchTerm] = useState("");
  const contentScrollRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 6. Extracted Hooks
  const { filteredTree, openFolders, toggleFolder } = useFileTree(files, searchTerm, fileTitleMap);
  useAppShortcuts({ adjustFont, nav, filterCharacter, setFocusMode });
  useMetaTags({ titleName, titleSummary, titleNote, activeFile, filterCharacter, currentSceneId });
  useInitialScroll(sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId);
  const { handleExportPdf, handleShareUrl, shareCopied } = useScriptActions({
      exportMode, accentConfig, processedScriptHtml, rawScriptHtml, 
      titleHtml, titleName, activeFile, titleSummary, titleNote 
  });

  // Auto-switch Theme based on Script
  useEffect(() => {
      if (activeCloudScript?.markerThemeId) {
          const themeExists = markerThemes.some(t => t.id === activeCloudScript.markerThemeId);
          if (themeExists) {
              setCurrentThemeId(activeCloudScript.markerThemeId);
          }
      }
  }, [activeCloudScript?.id, activeCloudScript?.markerThemeId, markerThemes, setCurrentThemeId]);

  // 7. Effects
  // -- Auto-hide Title on Nav
  useEffect(() => {
    if (nav.homeOpen || nav.aboutOpen || nav.settingsOpen) {
      setShowTitle(false);
    }
  }, [nav.homeOpen, nav.aboutOpen, nav.settingsOpen]);

  // 7. Handlers moved to Pages or simplified
  const handleReturnHome = () => {
    nav.openHome();
    navigate("/");
  };
  
 // Navigation Props Bundle
  const navProps = {
      nav,
      enableLocalFiles,
      contentScrollRef
  }
  
  // 8. Render

  const headerTitle = nav.homeOpen ? "Screenplay Reader" : nav.aboutOpen ? "About" : nav.settingsOpen ? "Settings" : titleName || activeFile || activeCloudScript?.title || "選擇一個劇本";
  const canShare = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && Boolean(activeFile);
  const showReaderHeader = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && (
    activeFile || (activeCloudScript && cloudScriptMode === 'read')
  );

  // 9. Render
  return (
    <MainLayout
      isDesktopSidebarOpen={nav.isDesktopSidebarOpen}
      setIsDesktopSidebarOpen={nav.setIsDesktopSidebarOpen}
      isMobileDrawerOpen={nav.isMobileDrawerOpen}
      setIsMobileDrawerOpen={nav.setIsMobileDrawerOpen}
      fileTree={filteredTree}
      activeFile={activeFile}
      onSelectFile={(file) => navigate("/file/" + encodeURIComponent(file.name))} 
      accentStyle={accentStyle}
      openAbout={nav.openAbout}
      openSettings={nav.openSettings}
      closeAbout={() => nav.setAboutOpen(false)}
      openHome={() => {
        nav.openHome();
        navigate("/");
      }}
      files={files}
      fileTitleMap={fileTitleMap}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      openFolders={openFolders}
      toggleFolder={toggleFolder}
      fileTagsMap={fileTagsMap}
      fileLabelMode={fileLabelMode}
      setFileLabelMode={setFileLabelMode}
      sceneList={sceneList}
      currentSceneId={currentSceneId}
      onSelectScene={(id) => { setCurrentSceneId(id); setScrollSceneId(id); }}
    >
        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col gap-3 lg:gap-4 h-full">
          {showReaderHeader && (
            <div>
              <ReaderHeader
              accentStyle={accentStyle}
              hasTitle={showReaderHeader && hasTitle}
              onToggleTitle={() => setShowTitle((v) => !v)}
              titleName={headerTitle}
              activeFile={activeFile}
              fileMeta={fileMeta}
              isSidebarOpen={nav.isDesktopSidebarOpen}
              setSidebarOpen={nav.setSidebarOpen}
              handleExportPdf={handleExportPdf}
              onShareUrl={handleShareUrl}
              canShare={canShare}
              shareCopied={shareCopied}
              sceneList={sceneList}
              currentSceneId={currentSceneId}
              onSelectScene={(id) => { setCurrentSceneId(id); setScrollSceneId(id); }}
              titleNote={titleNote}
              characterList={characterList}
              filterCharacter={filterCharacter}
              setFilterCharacter={setFilterCharacter}
              setFocusMode={setFocusMode}
              scrollProgress={scrollProgress}
              totalLines={0} 
              onEdit={activeCloudScript ? () => setCloudScriptMode("edit") : null}
              onBack={handleReturnHome}
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
            />
            {!nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && hasTitle && showTitle && (
              <Card className="border border-border border-t-0 rounded-t-none">
                <CardContent className="p-4">
                  <div className="title-page prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: titleHtml }} />
                </CardContent>
              </Card>
            )}
          </div>
          )}

          {nav.aboutOpen ? (
            <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
              <AboutPanelLazy accentStyle={accentStyle} onClose={() => nav.setAboutOpen(false)} />
            </React.Suspense>
          ) : nav.settingsOpen ? (
            <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
              <SettingsPanel onClose={() => nav.setSettingsOpen(false)} />
            </React.Suspense>
          ) : (
            <Routes>
                <Route path="/" element={<DashboardPage scriptManager={scriptManager} navProps={navProps} />} />
                <Route path="/edit/:id" element={<CloudEditorPage scriptManager={scriptManager} navProps={navProps} />} />
                <Route path="/read/:id" element={<PublicReaderPage scriptManager={scriptManager} navProps={navProps} />} />
                <Route path="/file/:name" element={<LocalReaderPage scriptManager={scriptManager} navProps={navProps} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
    </MainLayout>
  );
}

export default App;
