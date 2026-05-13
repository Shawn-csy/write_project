import React, { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getScript } from "../lib/api/scripts";
import { usePersistMarkerTheme } from "../hooks/usePersistMarkerTheme";
import LiveEditor from "../components/editor/LiveEditor";
import { Loader2 } from "lucide-react";

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

  const handlePersistMarkerTheme = usePersistMarkerTheme(scriptManager);

  useEffect(() => {
      if (!id) return;

      // Always reset UI to reader mode when entering this page
      navProps.nav.resetToReader();

      const params = new URLSearchParams(location.search);
      const modeParam = params.get("mode");
      const targetMode = modeParam === "read" ? "read" : "edit";

      // Skip fetch only if we have the full script data (content must be defined,
      // since the list API deliberately omits content via ScriptSummary)
      if (activeCloudScript?.id === id && activeCloudScript.content !== undefined) {
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

  if (!activeCloudScript || activeCloudScript.id !== id || activeCloudScript.content === undefined) {
      return (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              {activeCloudScript?.id === id && activeCloudScript?.title ? (
                  <p className="text-sm">{activeCloudScript.title}</p>
              ) : null}
          </div>
      );
  }

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
