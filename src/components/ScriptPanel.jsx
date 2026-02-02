import React from "react";
import ScriptSurface from "./ScriptSurface";
import { useScriptViewerDefaults } from "../hooks/useScriptViewerDefaults";

function ScriptPanel({
  isLoading,
  rawScript,
  filterCharacter,
  focusMode,
  focusEffect,
  focusContentMode,
  highlightCharacters,
  highlightSfx,
  setCharacterList,
  setTitleHtml,
  setTitleName,
  setTitleNote,
  setTitleSummary,
  setHasTitle,
  setRawScriptHtml,
  setRawScriptHtmlProcessed,
  setScenes,
  scrollToScene,
  theme,
  markerConfigs: propMarkerConfigs, // Receive prop
  fontSize = 14,
  bodyFontSize = 14,
  dialogueFontSize = 14,
  accentColor,
  scrollRef,
  onScrollProgress,
  onDoubleClick,
  hiddenMarkerIds: propHiddenMarkerIds, // Optional override
}) {
  const viewerDefaults = useScriptViewerDefaults({
    theme,
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    accentColor,
    markerConfigs: propMarkerConfigs,
    hiddenMarkerIds: propHiddenMarkerIds
  });

  return (
    <ScriptSurface
      outerClassName="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm reader-surface"
      scrollClassName="h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
      contentClassName="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10 space-y-4"
      scrollRef={scrollRef}
      onScrollProgress={onScrollProgress}
      onDoubleClick={onDoubleClick}
      isLoading={isLoading}
      loadingMessage="載入中..."
      emptyMessage="乖乖過期了嗎。"
      text={rawScript}
      viewerProps={{
        filterCharacter,
        focusMode,
        focusEffect,
        focusContentMode,
        highlightCharacters,
        highlightSfx,
        onCharacters: setCharacterList,
        onTitle: setTitleHtml,
        onTitleName: setTitleName,
        onTitleNote: setTitleNote,
        onSummary: setTitleSummary,
        onHasTitle: setHasTitle,
        onRawHtml: setRawScriptHtml,
        onProcessedHtml: setRawScriptHtmlProcessed,
        onScenes: setScenes,
        scrollToScene,
        ...viewerDefaults
      }}
    />
  );
}


export default React.memo(ScriptPanel);
