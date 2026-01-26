import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import ScriptPanel from "../components/ScriptPanel";
import { getPublicScript, getPublicThemes } from "../lib/db";

export default function PublicReaderPage({ scriptManager, navProps }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markerConfigs, setMarkerConfigs } = useSettings();
  
  const [overrideConfigs, setOverrideConfigs] = React.useState(null);

  const { 
      setActivePublicScriptId, setRawScript, setTitleName, setActiveFile,
      isLoading, setIsLoading, setActiveCloudScript,
      // Props required for ScriptPanel
      rawScript, filterCharacter, focusMode, focusEffect, focusContentMode,
      highlightCharacters, highlightSfx, setCharacterList, setTitleHtml, setTitleNote, setTitleSummary, setHasTitle, setRawScriptHtml, setProcessedScriptHtml, setSceneList,
      scrollSceneId, fontSize, bodyFontSize, dialogueFontSize, accentConfig, contentScrollRef, setScrollProgress, setCloudScriptMode
  } = scriptManager;

  useEffect(() => {
    // Reset override on mount/unmount or id change
    setOverrideConfigs(null);
    if(scriptManager.setOverrideMarkerConfigs) {
        scriptManager.setOverrideMarkerConfigs(null);
    }
  }, [id]);

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
                setActiveFile({ 
                    id: script.id, 
                    name: script.title,
                    type: 'script',
                    isPublic: true 
                });
                setActiveCloudScript(script); 
                setCloudScriptMode("read");
                
                // Fetch & Apply Public Theme if exists
                // Fetch & Apply Public Theme if exists
                if (script.markerTheme) {
                    // 1. Use embedded theme (works for private themes too)
                     try {
                         const matched = script.markerTheme;
                         if (matched && matched.configs) {
                             // Parse configs if string
                             const parsed = typeof matched.configs === 'string' ? JSON.parse(matched.configs) : matched.configs;
                             setOverrideConfigs(parsed);
                             // Push to Script Manager so AST is parsed correctly
                             if (scriptManager.setOverrideMarkerConfigs) {
                                 scriptManager.setOverrideMarkerConfigs(parsed);
                             }
                         }
                    } catch (e) {
                         console.error("Failed to apply embedded theme", e);
                    }
                } else if (script.markerThemeId) {
                    // 2. Fallback: Try to fetch from public themes (only works if theme is public)
                    try {
                        const themes = await getPublicThemes();
                        const matched = themes.find(t => t.id === script.markerThemeId);
                        if (matched && matched.configs) {
                             // Parse configs if string
                             const parsed = typeof matched.configs === 'string' ? JSON.parse(matched.configs) : matched.configs;
                             setOverrideConfigs(parsed);
                             if (scriptManager.setOverrideMarkerConfigs) {
                                 scriptManager.setOverrideMarkerConfigs(parsed);
                             }
                        }
                    } catch (e) {
                         console.error("Failed to load theme", e);
                    }
                }
            } else {
                console.error("Script not found");
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
        markerConfigs={overrideConfigs || markerConfigs}
      />
  );
}
