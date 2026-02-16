import React, { forwardRef } from "react";
import ScriptSurface from "./ScriptSurface";
import { useScriptViewerDefaults } from "../../hooks/useScriptViewerDefaults";

export const PreviewPanel = forwardRef(function PreviewPanel({
  show,
  readOnly,
  content,
  type,
  theme,
  fontSize,
  bodyFontSize,
  dialogueFontSize,
  lineHeight,
  accentColor,
  markerConfigs,
  onTitleHtml,
  onHasTitle,
  onTitleNote,
  onTitleSummary,
  onTitleName,
  onRawHtml,
  onProcessedHtml,
  initialSceneId,
  onScenes,
  onRequestEdit,
  hiddenMarkerIds,
  onContentClick,
  outerClassName,
  scrollClassName
}, ref) {
  if (!show && !readOnly) return null;

  const viewerDefaults = useScriptViewerDefaults({
    theme,
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    lineHeight,
    accentColor,
    markerConfigs,
    hiddenMarkerIds
  });

  return (
    <ScriptSurface
      show={show}
      readOnly={readOnly}
      outerClassName={outerClassName || `${readOnly ? "w-full" : "w-full sm:w-1/2"} h-full overflow-hidden bg-background flex flex-col`}
      scrollClassName={scrollClassName || "h-full overflow-y-auto px-4 py-8"}
      contentClassName=""
      scrollRef={ref}
      onDoubleClick={() => {
        if (readOnly && onRequestEdit) onRequestEdit();
      }}
      onContentClick={onContentClick}
      text={content}
      emptyMessage={
        readOnly
          ? "此劇本目前是空白，點兩下內容區即可進入編輯模式（手機支援雙擊觸控）。"
          : "此劇本目前是空白，直接開始輸入即可。"
      }
      viewerProps={{
        type,
        onTitle: onTitleHtml,
        onHasTitle,
        onTitleNote,
        onSummary: onTitleSummary,
        onTitleName,
        onRawHtml,
        onProcessedHtml,
        scrollToScene: initialSceneId,
        onScenes,
        ...viewerDefaults
      }}
    />
  );
});
