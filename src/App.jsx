import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileCode2, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useSettings } from "./contexts/SettingsContext";
import { useScriptManager } from "./hooks/useScriptManager";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useI18n } from "./contexts/I18nContext";

import { MetaTags } from "./components/common/MetaTags.jsx";
import { useReaderScriptActions } from "./hooks/useScriptActions";
import { useInitialScroll } from "./hooks/useInitialScroll";
import { updateScript } from "./lib/api/scripts";

import { ScriptViewProvider } from "./contexts/ScriptViewContext";

// New Imports
import { useTextLocator } from "./hooks/useTextLocator";
import { GlobalListeners } from "./components/common/GlobalListeners";
import { AppRouter } from "./AppRouter";
import { loadBasicScriptExport, loadXlsxScriptExport } from "./lib/scriptExportLoader";

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
  const appliedScriptThemeRef = useRef(null);
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
  const { t } = useI18n();
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
  const { handleExportPdf, handleShareUrl, shareCopied } = useReaderScriptActions({
      exportMode, accentConfig, 
      processedScriptHtml: scriptManager.processedScriptHtml, 
      rawScriptHtml: scriptManager.rawScriptHtml, 
      titleHtml: scriptManager.titleHtml, 
      titleName, activeFile: null, titleSummary, titleNote 
  });

  // 6. Effects
  useEffect(() => {
      if (!activeCloudScript) {
          appliedScriptThemeRef.current = null;
          return;
      }
      const scriptId = String(activeCloudScript?.id || "");
      if (!scriptId) return;
      if (appliedScriptThemeRef.current === scriptId) return;

      const desiredThemeId = String(activeCloudScript?.markerThemeId || "default");
      const themeExists = markerThemes.some((t) => String(t?.id || "") === desiredThemeId);

      // Wait until the script's custom theme is loaded, then apply once for this script.
      if (desiredThemeId !== "default" && !themeExists) return;
      setCurrentThemeId(themeExists ? desiredThemeId : "default");
      appliedScriptThemeRef.current = scriptId;
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

  const handleCloudMarkerThemeUpdate = useCallback(async (newThemeId) => {
      if (!activeCloudScript) return false;
      const normalizedThemeId = String(newThemeId || "default");
      const prevThemeId = String(activeCloudScript?.markerThemeId || "default");
      if (normalizedThemeId === prevThemeId) return true;

      scriptManager.setActiveCloudScript((prev) =>
        prev ? { ...prev, markerThemeId: normalizedThemeId } : prev
      );

      try {
          await updateScript(activeCloudScript.id, { markerThemeId: normalizedThemeId });
          return true;
      } catch (e) {
          console.error("Failed to update marker theme", e);
          scriptManager.setActiveCloudScript((prev) =>
            prev ? { ...prev, markerThemeId: prevThemeId } : prev
          );
          return false;
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
  
  const headerTitle = nav.homeOpen ? t("app.homeTitle") : nav.aboutOpen ? t("app.about") : nav.settingsOpen ? t("app.settings") : titleName || activeCloudScript?.title || t("app.selectScript");
  const canShare = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && Boolean(activeCloudScript);
  const exportTitle = titleName || activeCloudScript?.title || "script";
  const exportContent = rawScript || "";
  const renderedExportHtml = scriptManager.processedScriptHtml || scriptManager.rawScriptHtml || "";

  const readerDownloadOptions = [
    {
      id: "pdf",
      label: t("publicReader.exportPdf"),
      icon: Printer,
      onClick: () => handleExportPdf(),
      disabled: !exportContent && !scriptManager.titleHtml,
    },
    {
      id: "fountain",
      label: t("publicReader.downloadFountain"),
      icon: FileCode2,
      onClick: async () => {
        const { exportScriptAsFountain } = await loadBasicScriptExport();
        exportScriptAsFountain(exportTitle, exportContent);
      },
      disabled: !exportContent,
    },
    {
      id: "docx",
      label: t("publicReader.downloadDoc"),
      icon: FileText,
      onClick: async () => {
        const { exportScriptAsDocx } = await loadBasicScriptExport();
        await exportScriptAsDocx(exportTitle, { text: exportContent, renderedHtml: renderedExportHtml });
      },
      disabled: !exportContent,
    },
    {
      id: "xlsx",
      label: t("publicReader.downloadXlsx"),
      icon: FileSpreadsheet,
      onClick: async () => {
        const { exportScriptAsXlsx } = await loadXlsxScriptExport();
        await exportScriptAsXlsx(exportTitle, { text: exportContent, renderedHtml: renderedExportHtml });
      },
      disabled: !exportContent,
    },
    {
      id: "csv",
      label: t("publicReader.downloadCsv"),
      icon: FileSpreadsheet,
      onClick: async () => {
        const { exportScriptAsCsv } = await loadBasicScriptExport();
        exportScriptAsCsv(exportTitle, { text: exportContent, renderedHtml: renderedExportHtml });
      },
      disabled: !exportContent,
    },
  ];
  
  const isPublicReader = location.pathname.startsWith("/read/");
  const isPublicGallery = location.pathname === "/";
  const isPublicAuthor = location.pathname.startsWith("/author/");
  const isPublicOrg = location.pathname.startsWith("/org/");
  const isIndexableRoute = isPublicGallery || isPublicReader || isPublicAuthor || isPublicOrg;
  const canonicalPath = isIndexableRoute ? location.pathname : "/";
  const isReaderWorkspaceRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/edit/");
  const showReaderHeader = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && (
    (activeCloudScript && cloudScriptMode === 'read' && isReaderWorkspaceRoute) || isPublicReader
  );

  return (
    <>
    <MetaTags 
        titleName={titleName} 
        titleSummary={titleSummary} 
        titleNote={titleNote} 
        activeFile={null} 
        currentSceneId={currentSceneId} 
        indexable={isIndexableRoute}
        canonicalPath={canonicalPath}
        forceArticle={isPublicReader}
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
          
          readerDownloadOptions={readerDownloadOptions}
          handleShareUrl={handleShareUrl}
          shareCopied={shareCopied}
          handleReturnHome={handleReturnHome}
          handleCloudTitleUpdate={handleCloudTitleUpdate}
          handleCloudMarkerThemeUpdate={handleCloudMarkerThemeUpdate}
          
          accentStyle={accentStyle}
          fileLabelMode={fileLabelMode}
          setFileLabelMode={setFileLabelMode}
          
          activeFile={null}
          activeCloudScript={activeCloudScript}
          fileTagsMap={scriptManager.fileTagsMap}
       />
    </ScriptViewProvider>
    </>
  );
}

export default App;
