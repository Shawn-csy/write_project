import React, { useEffect, useRef, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useSettings } from "./contexts/SettingsContext";
import { useScriptManager } from "./hooks/useScriptManager";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useFileTree } from "./hooks/useFileTree";
import { useAppShortcuts } from "./hooks/useAppShortcuts";
import { MetaTags } from "./components/MetaTags.jsx";
import { useScriptActions } from "./hooks/useScriptActions";
import { useInitialScroll } from "./hooks/useInitialScroll";
import { updateScript } from "./lib/db";

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

import { StatisticsPanel } from "./components/statistics/StatisticsPanel";

const SettingsPanel = React.lazy(() => import("./components/SettingsPanel"));
const AboutPanelLazy = React.lazy(() => import("./components/AboutPanel"));

// New Imports
import { useTextLocator } from "./hooks/useTextLocator";
import { GlobalListeners } from "./components/GlobalListeners";

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
      markerConfigs,
      setCurrentThemeId,
      currentThemeId, 
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

  // 3. Custom Hooks
  // Pass markerConfigs to manager for AST parsing
  const scriptManager = useScriptManager(initialParamsRef, markerConfigs);
  const nav = useAppNavigation();
  const navigate = useNavigate();
  const location = useLocation();

  // Destructure scriptManager for easier usage
  const { 
      files, activeFile, 
      rawScript, rawScriptHtml, processedScriptHtml,
      fileMeta, fileTitleMap, fileTagsMap,
      sceneList, characterList,
      titleHtml, titleName, titleNote, titleSummary,
      hasTitle, showTitle, setShowTitle,
      filterCharacter, setFilterCharacter, setFocusMode, 
      currentSceneId, setCurrentSceneId, setScrollSceneId,
      // New additions from hook
      activeCloudScript, cloudScriptMode, setCloudScriptMode,
      ast // Get AST from manager
  } = scriptManager;

  // 4. Local State
  const [searchTerm, setSearchTerm] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 5. Extracted Hooks & Logic
  const { filteredTree, openFolders, toggleFolder } = useFileTree(files, searchTerm, fileTitleMap);
  const { contentScrollRef, handleLocateText } = useTextLocator(rawScript);
  
  useInitialScroll(sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId);
  const { handleExportPdf, handleShareUrl, shareCopied } = useScriptActions({
      exportMode, accentConfig, processedScriptHtml, rawScriptHtml, 
      titleHtml, titleName, activeFile, titleSummary, titleNote 
  });

  // 6. Effects
  useEffect(() => {
      if (activeCloudScript?.markerThemeId) {
          const themeExists = markerThemes.some(t => t.id === activeCloudScript.markerThemeId);
          if (themeExists) {
              setCurrentThemeId(activeCloudScript.markerThemeId);
          }
      }
  }, [activeCloudScript?.id, activeCloudScript?.markerThemeId, markerThemes, setCurrentThemeId]);

  const handleCloudTitleUpdate = useCallback(async (newTitle) => {
       if (!activeCloudScript || !newTitle) return;
       // Optimistic update
       scriptManager.setTitleName(newTitle); 
       scriptManager.setActiveCloudScript(prev => ({...prev, title: newTitle}));
       
       try {
           await updateScript(activeCloudScript.id, { title: newTitle });
       } catch (e) {
           console.error("Failed to rename script", e);
       }
  }, [activeCloudScript, scriptManager]);

  const handleReturnHome = () => {
    nav.openHome();
    navigate("/");
  };
  
  const navProps = {
      nav,
      enableLocalFiles,
      contentScrollRef
  }
  
  const headerTitle = nav.homeOpen ? "Screenplay Reader" : nav.aboutOpen ? "About" : nav.settingsOpen ? "Settings" : titleName || (typeof activeFile === 'object' ? activeFile?.name : activeFile) || activeCloudScript?.title || "選擇一個劇本";
  const canShare = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && Boolean(activeFile);
  
  const isPublicReader = location.pathname.startsWith("/read/");
  const showReaderHeader = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && (
    activeFile || (activeCloudScript && cloudScriptMode === 'read') || isPublicReader
  );

  return (
    <>
    <MetaTags 
        titleName={titleName} 
        titleSummary={titleSummary} 
        titleNote={titleNote} 
        activeFile={activeFile} 
        currentSceneId={currentSceneId} 
    />
    <GlobalListeners 
        nav={nav} 
        adjustFont={adjustFont} 
        filterCharacter={filterCharacter} 
        setFocusMode={setFocusMode} 
        setShowTitle={setShowTitle} 
    />

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
        <main className="flex-1 overflow-hidden flex flex-row h-full relative">
           <div className="flex-1 flex flex-col h-full min-w-0 relative">
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
                  isFocusMode={scriptManager.focusMode} 
                  markerThemes={markerThemes}
                  currentThemeId={currentThemeId}
                  switchTheme={setCurrentThemeId}
                  onTitleChange={activeCloudScript && !isPublicReader ? handleCloudTitleUpdate : undefined}
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
                  <SettingsPanel 
                    onClose={() => nav.setSettingsOpen(false)} 
                    activeTab={nav.settingsTab}
                    onTabChange={nav.setSettingsTab}
                  />
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
                        <StatisticsPanel rawScript={rawScript} scriptAst={ast} onLocateText={handleLocateText} />
                    </div>
               </div>
           )}
        </main>
    </MainLayout>
    </>
  );
}

export default App;
