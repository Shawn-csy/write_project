import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSettings } from "./contexts/SettingsContext";
import { useScriptManager } from "./hooks/useScriptManager";
import { useAppNavigation } from "./hooks/useAppNavigation";

import { MetaTags } from "./components/common/MetaTags.jsx";
import { useScriptActions } from "./hooks/useScriptActions";
import { useInitialScroll } from "./hooks/useInitialScroll";
import { updateScript } from "./lib/db";

import { ScriptViewProvider } from "./contexts/ScriptViewContext";

// New Imports
import { useTextLocator } from "./hooks/useTextLocator";
import { GlobalListeners } from "./components/common/GlobalListeners";
import { AppRouter } from "./AppRouter";

function App() {
  // 1. Contexts
  const {
      accentConfig,
      accentStyle,
      exportMode,
      fileLabelMode,
      setFileLabelMode,
      adjustFont,
      markerThemes,
      markerConfigs,
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

  // 3. Custom Hooks
  // Pass markerConfigs to manager for AST parsing
  const scriptManager = useScriptManager(initialParamsRef, markerConfigs);
  const nav = useAppNavigation();
  const navigate = useNavigate();
  const location = useLocation();

  // Destructure scriptManager for easier usage
  const { 
      // activeFile, 
      activeCloudScript, cloudScriptMode, setCloudScriptMode,
      titleName, titleSummary, titleNote,
      currentSceneId, setCurrentSceneId, setScrollSceneId,
      sceneList,
      rawScript
  } = scriptManager;

  // 4. Local State
  const [searchTerm, setSearchTerm] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 5. Extracted Hooks & Logic
  const { contentScrollRef, handleLocateText } = useTextLocator(rawScript);
  
  useInitialScroll(sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId);
  const { handleExportPdf, handleShareUrl, shareCopied } = useScriptActions({
      exportMode, accentConfig, 
      processedScriptHtml: scriptManager.processedScriptHtml, 
      rawScriptHtml: scriptManager.rawScriptHtml, 
      titleHtml: scriptManager.titleHtml, 
      titleName, activeFile: null, titleSummary, titleNote 
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
    if (activeCloudScript) {
        if (location.pathname.startsWith("/read/")) {
            // Visitor Mode
            const folder = activeCloudScript.folder === '/' ? '' : activeCloudScript.folder;
            if (activeCloudScript.folder && activeCloudScript.folder !== '/') {
                 const targetExpand = `${activeCloudScript.ownerId}:${activeCloudScript.folder}`;
                 navigate(`/?tab=read&public_expand=${encodeURIComponent(targetExpand)}`);
                 return;
            } else {
                 navigate("/?tab=read");
                 return;
            }
        } else {
            // Editor Mode
            if (activeCloudScript.folder) {
                navigate(`/dashboard?tab=write&folder=${encodeURIComponent(activeCloudScript.folder)}`);
                return;
            }
        }
    }
    
    // Default Fallback
    nav.openHome();
    navigate("/dashboard");
  };
  
  const navProps = {
      nav,
      contentScrollRef, 
      handleLocateText // Ensure this is passed
  }
  
  const headerTitle = nav.homeOpen ? "Screenplay Reader" : nav.aboutOpen ? "About" : nav.settingsOpen ? "Settings" : titleName || activeCloudScript?.title || "選擇一個劇本";
  const canShare = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && Boolean(activeCloudScript);
  
  const isPublicReader = location.pathname.startsWith("/read/");
  const showReaderHeader = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && (
    (activeCloudScript && cloudScriptMode === 'read') || isPublicReader
  );

  return (
    <>
    <MetaTags 
        titleName={titleName} 
        titleSummary={titleSummary} 
        titleNote={titleNote} 
        activeFile={null} 
        currentSceneId={currentSceneId} 
    />
    <GlobalListeners 
        nav={nav} 
        adjustFont={adjustFont} 
        filterCharacter={scriptManager.filterCharacter} 
        setFocusMode={scriptManager.setFocusMode} 
        setShowTitle={scriptManager.setShowTitle} 
    />

    <ScriptViewProvider scriptManager={scriptManager}>
       <AppRouter 
          scriptManager={scriptManager}
          nav={nav}
          navProps={navProps}
          
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showStats={showStats}
          setShowStats={setShowStats}
          scrollProgress={scrollProgress}
          
          headerTitle={headerTitle}
          canShare={canShare}
          isPublicReader={isPublicReader}
          showReaderHeader={showReaderHeader}
          
          handleExportPdf={handleExportPdf}
          handleShareUrl={handleShareUrl}
          shareCopied={shareCopied}
          handleReturnHome={handleReturnHome}
          handleCloudTitleUpdate={handleCloudTitleUpdate}
          
          accentStyle={accentStyle}
          fileLabelMode={fileLabelMode}
          setFileLabelMode={setFileLabelMode}
          
          activeFile={null}
          activeCloudScript={activeCloudScript}
          files={scriptManager.files}
          fileTitleMap={scriptManager.fileTitleMap}
          fileTagsMap={scriptManager.fileTagsMap}
       />
    </ScriptViewProvider>
    </>
  );
}

export default App;
