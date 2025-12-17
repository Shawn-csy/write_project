import React from "react";
import ScriptViewer from "./ScriptViewer";

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
  fontSize = 14,
  bodyFontSize = 14,
  dialogueFontSize = 14,
  accentColor,
  scrollRef,
  onScrollProgress,
}) {
  const handleScroll = () => {
    if (!scrollRef?.current || !onScrollProgress) return;
    const el = scrollRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      onScrollProgress(0);
      return;
    }
    const percent = Math.min(100, Math.max(0, (el.scrollTop / max) * 100));
    onScrollProgress(Number.isFinite(percent) ? percent : 0);
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm reader-surface"
      style={{
        '--script-font-size': `${fontSize}px`,
        '--body-font-size': `${bodyFontSize}px`,
        '--dialogue-font-size': `${dialogueFontSize}px`,
      }}
    >
      <div className="h-full overflow-y-auto scrollbar-hide" ref={scrollRef} onScroll={handleScroll}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">載入中...</p>}
          {!isLoading && rawScript && (
            <ScriptViewer
              text={rawScript}
              filterCharacter={filterCharacter}
              focusMode={focusMode}
              focusEffect={focusEffect}
              focusContentMode={focusContentMode}
              highlightCharacters={highlightCharacters}
              highlightSfx={highlightSfx}
              onCharacters={setCharacterList}
              onTitle={setTitleHtml}
              onTitleName={setTitleName}
              onTitleNote={setTitleNote}
              onSummary={setTitleSummary}
              onHasTitle={setHasTitle}
              onRawHtml={setRawScriptHtml}
              onProcessedHtml={setRawScriptHtmlProcessed}
              onScenes={setScenes}
              scrollToScene={scrollToScene}
              theme={theme}
              fontSize={fontSize}
              bodyFontSize={bodyFontSize}
              dialogueFontSize={dialogueFontSize}
              accentColor={accentColor}
            />
          )}
          {!isLoading && !rawScript && (
            <p className="text-sm text-muted-foreground">請從左側選擇一個劇本。</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScriptPanel;
