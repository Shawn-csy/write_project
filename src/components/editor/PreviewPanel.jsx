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
  initialSceneId,
  onScenes,
  onRequestEdit,
  hiddenMarkerIds
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
      outerClassName={`${readOnly ? "w-full" : "w-full sm:w-1/2"} h-full overflow-hidden bg-background flex flex-col`}
      scrollClassName="h-full overflow-y-auto px-4 py-8"
      contentClassName=""
      scrollRef={ref}
      onDoubleClick={() => {
        if (readOnly && onRequestEdit) onRequestEdit();
      }}
      text={content}
      viewerProps={{
        type,
        onTitle: onTitleHtml,
        onHasTitle,
        onTitleNote,
        onSummary: onTitleSummary,
        onTitleName,
        scrollToScene: initialSceneId,
        onScenes,
        ...viewerDefaults
      }}
    />
  );
});
