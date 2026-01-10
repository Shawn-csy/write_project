import React, { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getScript } from "../lib/db";
import LiveEditor from "../components/editor/LiveEditor";
import { useAppNavigation } from "../hooks/useAppNavigation";

// This page accepts :id
export default function CloudEditorPage({ scriptManager, navProps }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = useAppNavigation(); // We might need to lift nav too, but keeping consistent for now
  
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
          // Clear others
          scriptManager.setActiveFile(null);
          scriptManager.setActivePublicScriptId(null);
      }).catch(err => {
          console.error("Failed to load cloud script", err);
          navigate("/"); // Fallback
      });
  }, [id, location.search]);

  if (!activeCloudScript || activeCloudScript.id !== id) {
      return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
      <LiveEditor 
        scriptId={activeCloudScript.id} 
        initialData={activeCloudScript}
        readOnly={cloudScriptMode === 'read'}
        onRequestEdit={() => setCloudScriptMode("edit")}
        onClose={(finalSceneId) => {
           if (cloudScriptMode === 'edit') {
               setCloudScriptMode("read");
           } else {
               navigate("/");
           }
        }}
        initialSceneId={currentSceneId}
        defaultShowPreview={true}
      />
  );
}
