import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppearance } from "../../contexts/AppearanceContext";
import { useMarkerThemeContext } from "../../contexts/MarkerThemeContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useScriptManager } from "../../hooks/useScriptManager";
import { useAppNavigation } from "../../hooks/useAppNavigation";
import { useI18n } from "../../contexts/I18nContext";

import { useReaderScriptActions } from "../../hooks/useScriptActions";
import { usePersistMarkerTheme } from "../../hooks/usePersistMarkerTheme";
import { useInitialScroll } from "../../hooks/useInitialScroll";
import { updateScript } from "../../lib/api/scripts";
import { trackPageView } from "../../lib/firebase";
import { openPublicPath } from "../../lib/publicNavigation";

import { ScriptViewProvider } from "../../contexts/ScriptViewContext";
import { useTextLocator } from "../../hooks/useTextLocator";
import { buildV2TableExportFromRenderedHtml } from "../../lib/v2/exportAdapter";
import { useScriptDownloadOptions } from "../../hooks/shared/useScriptDownloadOptions";
import { buildExportMetadata } from "../../lib/exportMetadata";

import type { NavProps } from "../../types/nav";
import type { DownloadOption } from "../../types/routes";

import { AppRouter } from "../../AppRouter";
import { MetaTags } from "../common/MetaTags";
import { GlobalListeners } from "../common/GlobalListeners";

export function EditorShell() {
  // 1. Contexts
  const { accentConfig, accentStyle, adjustFont } = useAppearance();
  const {
    markerThemes,
    markerConfigs,
    setCurrentThemeId,
  } = useMarkerThemeContext();

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
  const { useV2Renderer } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    activeCloudScript, cloudScriptMode, setCloudScriptMode,
    titleName, titleSummary, titleNote,
    currentSceneId, setCurrentSceneId, setScrollSceneId,
    sceneList,
    rawScript,
  } = scriptManager;
  const effectiveMarkerConfigs = (scriptManager as unknown as { effectiveMarkerConfigs?: unknown[] }).effectiveMarkerConfigs
    || (markerConfigs as unknown[]);

  // Keep ref in sync so callbacks don't need activeCloudScript in deps
  activeCloudScriptRef.current = activeCloudScript;

  // 4. Local State
  const [showStats, setShowStats] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 5. Extracted Hooks & Logic
  const { contentScrollRef, handleLocateText } = useTextLocator(rawScript);

  useInitialScroll(sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId);

  const { handleShareUrl, shareCopied } = useReaderScriptActions({
    accentConfig,
    processedScriptHtml: scriptManager.processedScriptHtml,
    rawScriptHtml: scriptManager.rawScriptHtml,
    titleHtml: scriptManager.titleHtml,
    titleName,
    activeFile: undefined,
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

    const scriptThemeId = activeCloudScript?.markerThemeId;

    // If the script has no assigned theme, don't force a switch to "default" —
    // keep whatever theme the user currently has active so column mode / V2
    // settings remain intact across script switches.
    if (!scriptThemeId) {
      appliedScriptThemeRef.current = scriptId;
      return;
    }

    const themeExists = markerThemes.some((t) => String(t?.id || "") === scriptThemeId);

    // Wait until the script's custom theme is loaded, then apply once for this script.
    if (!themeExists) return;
    setCurrentThemeId(scriptThemeId);
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

  const handleReturnHome = useCallback(() => {
    const script = activeCloudScriptRef.current;
    if (script) {
      if (location.pathname.startsWith("/read/")) {
        // Visitor Mode — /read/ is Next.js; return to Next.js gallery
        openPublicPath("/");
        return;
      } else {
        // Editor Mode
        if (script.folder) {
          navigate(`/dashboard?tab=write&folder=${encodeURIComponent(script.folder)}`);
          return;
        }
      }
    }
    // Default Fallback
    nav.openHome();
    navigate("/dashboard");
  }, [location.pathname, navigate, nav]);

  const navProps: NavProps = useMemo(() => ({
    nav,
    contentScrollRef,
    handleLocateText,
  }), [nav, contentScrollRef, handleLocateText]);

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
  const exportMetadata = useMemo(
    () => buildExportMetadata(activeCloudScript, exportTitle),
    [activeCloudScript, exportTitle]
  );

  const sharedReaderDownloadOptions: DownloadOption[] = useScriptDownloadOptions({
    t,
    title: exportTitle,
    content: exportContent,
    markerConfigs: effectiveMarkerConfigs as any,
    getRenderedHtml: () => renderedExportHtml,
    exportMetadata,
    pdfCoverUrl: activeCloudScript?.coverUrl,
    disablePdf: !exportContent && !scriptManager.titleHtml,
    disableDocx: !exportContent,
    disableXlsx: !exportContent,
    disableGoogleDocs: !exportContent,
    preferTableForGoogleDocs: !!useV2Renderer,
    enableGoogleDocsTable: !!useV2Renderer,
    showGoogleDocsTableOption: true,
    fallbackToClassicWhenTableMissing: true,
    resolveTableExport: (html) => buildV2TableExportFromRenderedHtml(html),
  });

  const readerDownloadOptions: DownloadOption[] = sharedReaderDownloadOptions;

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

      <ScriptViewProvider scriptManager={scriptManager}>
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

export default EditorShell;
