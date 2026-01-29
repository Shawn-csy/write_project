import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ScriptPanel from "../components/ScriptPanel";

export default function LocalReaderPage({ scriptManager, navProps, hiddenMarkerIds = [] }) {
  const { name } = useParams(); // Filename
  const navigate = useNavigate();
  
  const { 
      files, loadScript, activeFile,
      isLoading, 
      rawScript, filterCharacter, focusMode, focusEffect, focusContentMode,
      highlightCharacters, highlightSfx, setCharacterList, setTitleHtml, setTitleName, setTitleNote, setTitleSummary, setHasTitle, setRawScriptHtml, setProcessedScriptHtml, setSceneList,
      scrollSceneId, fontSize, bodyFontSize, dialogueFontSize, accentConfig, setScrollProgress, setCloudScriptMode
  } = scriptManager;

  useEffect(() => {
      if (!name || !files.length) return;
      
      const target = files.find(f => f.name === name || f.display === name);
      if (target) {
          navProps.nav.resetToReader();
          if (activeFile !== target.name) {
              loadScript(target);
              setCloudScriptMode("read");
              // ensure we don't have cloud script active
              scriptManager.setActiveCloudScript(null);
              scriptManager.setActivePublicScriptId(null);
          }
      } else {
          // File not found?
          console.warn("File not found:", name);
          // navigate("/"); // Don't redirect automatically to avoid loops
      }
  }, [name, files]);
  
  if (files.length > 0 && name && !files.find(f => f.name === name || f.display === name)) {
      return <div className="p-8 text-center bg-destructive/10 text-destructive rounded-lg m-4">找不到檔案：{name}</div>;
  }

  return (
      <ScriptPanel
        isLoading={isLoading}
        hiddenMarkerIds={hiddenMarkerIds}
        rawScript={rawScript}
        filterCharacter={filterCharacter}
        focusMode={focusMode}
        focusEffect={focusEffect}
        focusContentMode={focusContentMode}
        highlightCharacters={highlightCharacters}
        highlightSfx={highlightSfx}
        setCharacterList={setCharacterList}
        setTitleHtml={setTitleHtml}
        setTitleName={setTitleName} 
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
        markerConfigs={Array.isArray(scriptManager.effectiveMarkerConfigs) ? scriptManager.effectiveMarkerConfigs : (scriptManager.effectiveMarkerConfigs ? Object.values(scriptManager.effectiveMarkerConfigs) : [])}
      />
  );
}
