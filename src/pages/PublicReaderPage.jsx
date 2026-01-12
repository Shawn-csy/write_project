import { useSettings } from "../contexts/SettingsContext";

export default function PublicReaderPage({ scriptManager, navProps }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markerConfigs } = useSettings(); // Get configs
  
  const { 
  // ... (keep existing descructuring) ...
      setActivePublicScriptId, setRawScript, setTitleName, setActiveFile,
      isLoading, setIsLoading,
      // Props required for ScriptPanel
      rawScript, filterCharacter, focusMode, focusEffect, focusContentMode,
      highlightCharacters, highlightSfx, setCharacterList, setTitleHtml, setTitleNote, setTitleSummary, setHasTitle, setRawScriptHtml, setProcessedScriptHtml, setSceneList,
      scrollSceneId, fontSize, bodyFontSize, dialogueFontSize, accentConfig, contentScrollRef, setScrollProgress, setCloudScriptMode
  } = scriptManager;

// ... (keep existing useEffect) ...

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
        markerConfigs={markerConfigs} // Pass to ScriptPanel
      />
  );
}
