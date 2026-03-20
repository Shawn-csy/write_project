import React, { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getScript, updateScript } from "../lib/api/scripts";
import LiveEditor from "../components/editor/LiveEditor";

// This page accepts :id
export default function CloudEditorPage({ scriptManager, navProps }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Script Manager Context
  const { 
      activeCloudScript, setActiveCloudScript, 
      setRawScript, setTitleName, 
      currentSceneId, setCurrentSceneId, setScrollSceneId,
      cloudScriptMode, setCloudScriptMode
  } = scriptManager;

  useEffect(() => {
      if (!id) return;
      
      // Always reset UI to reader mode when entering this page
      navProps.nav.resetToReader();

      const params = new URLSearchParams(location.search);
      const modeParam = params.get("mode");
      const targetMode = modeParam === "read" ? "read" : "edit";

      // If we already have the correct script loaded, don't re-fetch
      if (activeCloudScript?.id === id) {
          setCloudScriptMode(targetMode);
          return; 
      }

      setCloudScriptMode(targetMode);
      getScript(id).then(script => {
          setActiveCloudScript(script);
          setRawScript(script.content || "");
          setTitleName(script.title || "Untitled");
          scriptManager.setActivePublicScriptId(null);
      }).catch(err => {
          console.error("Failed to load cloud script", err);
          navigate("/"); // Fallback
      });
  }, [id, location.search]);

  if (!activeCloudScript || activeCloudScript.id !== id) {
      return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const handlePersistMarkerTheme = async (themeId) => {
    if (!activeCloudScript?.id) return false;
    const normalizedThemeId = String(themeId || "default");
    const prevThemeId = String(activeCloudScript?.markerThemeId || "default");
    if (normalizedThemeId === prevThemeId) return true;
    setActiveCloudScript((prev) =>
      prev ? { ...prev, markerThemeId: normalizedThemeId } : prev
    );
    try {
      await updateScript(activeCloudScript.id, { markerThemeId: normalizedThemeId });
      return true;
    } catch (err) {
      console.error("Failed to update marker theme", err);
      setActiveCloudScript((prev) =>
        prev ? { ...prev, markerThemeId: prevThemeId } : prev
      );
      return false;
    }
  };

  const guideParams = new URLSearchParams(location.search);
  const crossModeGuideActive = guideParams.get("guide") === "1";
  const crossModeGuideStep = guideParams.get("guideStep") || "";
  const navigateGuide = (mode, step = "") => {
    if (!id) return;
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (step) {
      params.set("guide", "1");
      params.set("guideStep", step);
    }
    navigate(`/edit/${id}?${params.toString()}`);
  };
  const handleCrossGuideNext = () => {
    if (crossModeGuideStep === "editIntro") {
      navigateGuide("edit", "editPreview");
      return;
    }
    if (crossModeGuideStep === "editPreview") {
      navigateGuide("edit", "editActions");
      return;
    }
    if (crossModeGuideStep === "editActions") {
      navigateGuide("read", "readFinish");
    }
  };
  const handleCrossGuidePrev = () => {
    if (crossModeGuideStep === "editPreview") {
      navigateGuide("edit", "editIntro");
      return;
    }
    if (crossModeGuideStep === "editActions") {
      navigateGuide("edit", "editPreview");
      return;
    }
    if (crossModeGuideStep === "editIntro") {
      navigateGuide("read", "readToEdit");
    }
  };
  const handleCrossGuideExit = () => navigateGuide("read");

  const isReadMode = cloudScriptMode === 'read';
  const currentGuideParams = new URLSearchParams(location.search);
  const isGuideRunning = currentGuideParams.get("guide") === "1";

  return (
      <LiveEditor 
        scriptId={activeCloudScript.id} 
        initialData={activeCloudScript}
        readOnly={isReadMode}
        onRequestEdit={() => {
          const params = new URLSearchParams();
          params.set("mode", "edit");
          if (isGuideRunning) {
            params.set("guide", "1");
            params.set("guideStep", "editIntro");
          }
          navigate(`/edit/${activeCloudScript.id}?${params.toString()}`);
        }}
        onClose={(finalSceneId) => {
           if (cloudScriptMode === 'edit') {
               const params = new URLSearchParams();
               params.set("mode", "read");
               navigate(`/edit/${activeCloudScript.id}?${params.toString()}`);
           } else {
               navigate("/");
           }
        }}
        initialSceneId={currentSceneId}
        defaultShowPreview={true}
        contentScrollRef={navProps?.contentScrollRef}
        onTitleHtml={scriptManager.setTitleHtml}
        onHasTitle={scriptManager.setHasTitle}
        onTitleNote={scriptManager.setTitleNote}
        onTitleSummary={scriptManager.setTitleSummary}
        onTitleName={scriptManager.setTitleName}
        onOpenMarkerSettings={() => {
            navProps.nav.setSettingsTab("markers");
            navProps.nav.setSettingsOpen(true);
        }}
        isSidebarOpen={navProps.nav.isDesktopSidebarOpen}
        onSetSidebarOpen={navProps.nav.setSidebarOpen}
        showHeader={!isReadMode}
        crossModeGuideActive={crossModeGuideActive}
        crossModeGuideStep={crossModeGuideStep}
        onCrossGuideNext={handleCrossGuideNext}
        onCrossGuidePrev={handleCrossGuidePrev}
        onCrossGuideExit={handleCrossGuideExit}
        onPersistMarkerTheme={!isReadMode ? handlePersistMarkerTheme : undefined}
      />
  );
}
