import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useSettings } from "./contexts/SettingsContext";
import { useScriptManager } from "./hooks/useScriptManager";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useI18n } from "./contexts/I18nContext";

import { useReaderScriptActions } from "./hooks/useScriptActions";
import { usePersistMarkerTheme } from "./hooks/usePersistMarkerTheme";
import { useInitialScroll } from "./hooks/useInitialScroll";
import { updateScript } from "./lib/api/scripts";
import { trackPageView } from "./lib/firebase";

import { ScriptViewProvider } from "./contexts/ScriptViewContext";
import { useTextLocator } from "./hooks/useTextLocator";
import { loadBasicScriptExport, loadXlsxScriptExport } from "./lib/scriptExportLoader";

import type { NavProps } from "./types/nav";
import type { MarkerConfig } from "./hooks/useScriptManager.types";
import type { DownloadOption } from "./types/routes";

// Migrated TS component
import { AppRouter } from "./AppRouter";

// JS components pending TS migration
type AC = React.ComponentType<Record<string, unknown>>;
import { MetaTags as MetaTagsJs } from "./components/common/MetaTags.jsx";
import { GlobalListeners as GlobalListenersJs } from "./components/common/GlobalListeners";
const MetaTags = MetaTagsJs as unknown as AC;
const GlobalListeners = GlobalListenersJs as unknown as AC;

function App() {
  // 1. Contexts
  const {
    accentConfig,
    accentStyle,
    exportMode,
    adjustFont,
    markerThemes,
    markerConfigs,
    setCurrentThemeId,
  } = useSettings() as {
    accentConfig: unknown;
    accentStyle: string;
    exportMode: string | undefined;
    adjustFont: (delta: number) => void;
    markerThemes: { id: string; [key: string]: unknown }[];
    markerConfigs: MarkerConfig[];
    setCurrentThemeId: (id: string) => void;
    [key: string]: unknown;
  };

  // 2. Refs
  const initialParamsRef = useRef<{ char: string | null; scene: string | null }>({ char: null, scene: null });
  const appliedScriptThemeRef = useRef<string | null>(null);
  const lastTrackedPageRef = useRef("");
  const activeCloudScriptRef = useRef<ReturnType<typeof useScriptManager>["activeCloudScript"]>(null);

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
  const scriptManager = useScriptManager(initialParamsRef, markerConfigs);
  const nav = useAppNavigation();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    activeCloudScript, cloudScriptMode, setCloudScriptMode,
    titleName, titleSummary, titleNote,
    currentSceneId, setCurrentSceneId, setScrollSceneId,
    sceneList,
    rawScript,
  } = scriptManager;

  // Keep ref in sync so callbacks don't need activeCloudScript in deps
  activeCloudScriptRef.current = activeCloudScript;

  // 4. Local State
  const [showStats, setShowStats] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 5. Extracted Hooks & Logic
  const { contentScrollRef, handleLocateText } = useTextLocator(rawScript);

  useInitialScroll(sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId);

  const { handleExportPdf, handleShareUrl, shareCopied } = useReaderScriptActions({
    accentConfig,
    processedScriptHtml: scriptManager.processedScriptHtml,
    rawScriptHtml: scriptManager.rawScriptHtml,
    titleHtml: scriptManager.titleHtml,
    titleName,
    activeFile: null,
    titleSummary,
    titleNote,
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (lastTrackedPageRef.current === currentPath) return;
    lastTrackedPageRef.current = currentPath;
    trackPageView({
      path: currentPath,
      title: document.title,
      location: window.location.href,
    });
  }, [location.pathname, location.search, location.hash]);

  const handleCloudTitleUpdate = useCallback(async (newTitle: string) => {
    const script = activeCloudScriptRef.current;
    if (!script || !newTitle) return;
    scriptManager.setTitleName(newTitle);
    scriptManager.setActiveCloudScript((prev) => prev ? { ...prev, title: newTitle } : prev);
    try {
      await updateScript(script.id, { title: newTitle });
    } catch (e) {
      console.error("Failed to rename script", e);
    }
  }, [scriptManager]);

  const handleCloudMarkerThemeUpdate = usePersistMarkerTheme(scriptManager);

  const handleReturnHome = () => {
    if (activeCloudScript) {
      if (location.pathname.startsWith("/read/")) {
        // Visitor Mode
        if (activeCloudScript.folder && activeCloudScript.folder !== "/") {
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

  const navProps: NavProps = {
    nav,
    contentScrollRef,
    handleLocateText,
  };

  const headerTitle = nav.homeOpen
    ? t("app.homeTitle")
    : nav.aboutOpen
    ? t("app.about")
    : nav.settingsOpen
    ? t("app.settings")
    : titleName || activeCloudScript?.title || t("app.selectScript");

  const canShare = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && Boolean(activeCloudScript);
  const exportTitle = titleName || activeCloudScript?.title || "script";
  const exportContent = rawScript || "";
  const renderedExportHtml = scriptManager.processedScriptHtml || scriptManager.rawScriptHtml || "";

  const readerDownloadOptions: DownloadOption[] = [
    {
      id: "pdf",
      label: t("publicReader.exportPdf"),
      icon: Printer,
      onClick: () => (handleExportPdf as any)(),
      disabled: !exportContent && !scriptManager.titleHtml,
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
  ];

  const isPublicReader = location.pathname.startsWith("/read/");
  const isPublicGallery = location.pathname === "/";
  const isPublicAuthor = location.pathname.startsWith("/author/");
  const isPublicOrg = location.pathname.startsWith("/org/");
  const isIndexableRoute = isPublicGallery || isPublicReader || isPublicAuthor || isPublicOrg;
  const canonicalPath = isIndexableRoute ? location.pathname : "/";
  const isReaderWorkspaceRoute =
    location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/edit/");
  const showReaderHeader =
    !nav.homeOpen &&
    !nav.aboutOpen &&
    !nav.settingsOpen &&
    ((activeCloudScript !== null && cloudScriptMode === "read" && isReaderWorkspaceRoute) || isPublicReader);

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

      <ScriptViewProvider scriptManager={scriptManager as any}>
        <AppRouter
          scriptManager={scriptManager}
          nav={nav}
          navProps={navProps}
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
          activeCloudScript={activeCloudScript}
        />
      </ScriptViewProvider>
    </>
  );
}

export default App;
