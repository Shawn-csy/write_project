import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import ScriptPanel from "../components/ScriptPanel";
import { getPublicScript } from "../lib/db";

export default function PublicReaderPage({ scriptManager, navProps }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markerConfigs } = useSettings();
  
  const { 
      setActivePublicScriptId, setRawScript, setTitleName, setActiveFile,
      isLoading, setIsLoading, setActiveCloudScript,
      // Props required for ScriptPanel
      rawScript, filterCharacter, focusMode, focusEffect, focusContentMode,
      highlightCharacters, highlightSfx, setCharacterList, setTitleHtml, setTitleNote, setTitleSummary, setHasTitle, setRawScriptHtml, setProcessedScriptHtml, setSceneList,
      scrollSceneId, fontSize, bodyFontSize, dialogueFontSize, accentConfig, contentScrollRef, setScrollProgress, setCloudScriptMode
  } = scriptManager;

  useEffect(() => {
    if (!id) return;
    
    const loadScript = async () => {
        setIsLoading(true);
        setActivePublicScriptId(id);
        try {
            const script = await getPublicScript(id);
            if (script) {
                setRawScript(script.content || "");
                setTitleName(script.title || "Untitled");
                // For public view, we might not need full file object, but setting active file helps consistency
                setActiveFile({ 
                    id: script.id, 
                    name: script.title,
                    type: 'script',
                    isPublic: true 
                });
                setActiveCloudScript(script); // Added for safety if App.jsx uses it
                setCloudScriptMode("read");
            } else {
                console.error("Script not found");
                // navigate("/"); // Optional: redirect if not found
            }
        } catch (error) {
            console.error("Failed to load public script:", error);
        } finally {
            setIsLoading(false);
        }
    };

    loadScript();
  }, [id, setIsLoading, setActivePublicScriptId, setRawScript, setTitleName, setActiveFile, setCloudScriptMode]);

  return (
      <ScriptPanel
        isLoading={isLoading}
        rawScript={rawScript}
        filterCharacter={filterCharacter}
        focusMode={focusMode}
        focusEffect={focusEffect}
        focusContentMode={focusContentMode}
        highlightCharacters={highlightCharacters}
        highlightSfx={highlightSfx}
        setCharacterList={setCharacterList}
        setTitleHtml={setTitleHtml}
        setTitleName={scriptManager.setTitleName} 
        setTitleNote={setTitleNote}
        setTitleSummary={setTitleSummary}
        setHasTitle={setHasTitle}
        setRawScriptHtml={setRawScriptHtml}
        setRawScriptHtmlProcessed={setProcessedScriptHtml}
        setScenes={setSceneList}
        scrollToScene={scrollSceneId}
        fontSize={fontSize}
        bodyFontSize={bodyFontSize}
        dialogueFontSize={dialogueFontSize}
        accentColor={accentConfig?.accent || "#3b82f6"}
        scrollRef={navProps?.contentScrollRef}
        onScrollProgress={setScrollProgress}
        markerConfigs={markerConfigs}
      />
  );
}
