import React from "react";
import ScriptViewer from "./ScriptViewer";

function ScriptPanel({
  isLoading,
  rawScript,
  filterCharacter,
  focusMode,
  focusEffect,
  setCharacterList,
  setTitleHtml,
  setTitleName,
  setHasTitle,
  setRawScriptHtml,
  theme,
  fontSize = 14,
}) {
  return (
    <div
      className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm reader-surface"
      style={{ '--script-font-size': `${fontSize}px` }}
    >
      <div className="h-full overflow-y-auto scrollbar-hide">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">載入中...</p>}
          {!isLoading && rawScript && (
            <ScriptViewer
              text={rawScript}
              filterCharacter={filterCharacter}
              focusMode={focusMode}
              focusEffect={focusEffect}
              onCharacters={setCharacterList}
              onTitle={setTitleHtml}
              onTitleName={setTitleName}
              onHasTitle={setHasTitle}
              onRawHtml={setRawScriptHtml}
              theme={theme}
              fontSize={fontSize}
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
