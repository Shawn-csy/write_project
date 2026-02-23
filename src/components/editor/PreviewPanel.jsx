import React, { forwardRef } from "react";
import ScriptSurface from "./ScriptSurface";
import { useScriptViewerDefaults } from "../../hooks/useScriptViewerDefaults";
import { useI18n } from "../../contexts/I18nContext";

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
  const { t } = useI18n();
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
          ? t("previewPanel.emptyReadOnly")
          : t("previewPanel.emptyEditable")
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
