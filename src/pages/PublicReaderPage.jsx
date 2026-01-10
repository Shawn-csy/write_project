import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicScript } from "../lib/db";
import ScriptPanel from "../components/ScriptPanel";

export default function PublicReaderPage({ scriptManager, navProps }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
      setActivePublicScriptId, setRawScript, setTitleName, setActiveFile,
      isLoading, setIsLoading,
      // Props required for ScriptPanel
      rawScript, filterCharacter, focusMode, focusEffect, focusContentMode,
      highlightCharacters, highlightSfx, setCharacterList, setTitleHtml, setTitleNote, setTitleSummary, setHasTitle, setRawScriptHtml, setProcessedScriptHtml, setSceneList,
      scrollSceneId, fontSize, bodyFontSize, dialogueFontSize, accentConfig, contentScrollRef, setScrollProgress, setCloudScriptMode
  } = scriptManager;

  useEffect(() => {
      if (!id) return;
      navProps.nav.resetToReader();
      setIsLoading(true);
      getPublicScript(id).then(fullScript => {
          setRawScript(fullScript.content || "");
          setTitleName(fullScript.title || "Public Script");
          setActiveFile(fullScript.title || "Public Script"); // UI HACK to show header
          setActivePublicScriptId(id);
          setCloudScriptMode("read");
          // Clear others
          scriptManager.setActiveCloudScript(null);
      }).catch(err => {
          console.error("Failed to load public script", err);
          navigate("/");
      }).finally(() => {
          setIsLoading(false);
      });
  }, [id]);

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
      />
  );
}
