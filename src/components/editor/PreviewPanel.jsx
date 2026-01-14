import React, { forwardRef } from "react";
import ScriptViewer from "../ScriptViewer";

export const PreviewPanel = forwardRef(function PreviewPanel({
  show,
  readOnly,
  content,
  type,
  theme,
  fontSize,
  bodyFontSize,
  dialogueFontSize,
  accentColor,
  markerConfigs,
  onTitleHtml,
  onHasTitle,
  onTitleNote,
  onTitleSummary,
  onTitleName,
  initialSceneId,
  onScenes,
  onRequestEdit
}, ref) {
  if (!show && !readOnly) return null;

  return (
    <div className={`${readOnly ? "w-full" : "w-1/2"} h-full overflow-hidden bg-background flex flex-col`}>
      <div
        ref={ref}
        className="h-full overflow-y-auto px-4 py-8"
        onDoubleClick={() => {
          if (readOnly && onRequestEdit) onRequestEdit();
        }}
      >
        <ScriptViewer
          text={content}
          type={type}
          theme={theme}
          fontSize={fontSize}
          bodyFontSize={bodyFontSize}
          dialogueFontSize={dialogueFontSize}
          accentColor={accentColor}
          markerConfigs={markerConfigs}
          onTitle={onTitleHtml}
          onHasTitle={onHasTitle}
          onTitleNote={onTitleNote}
          onSummary={onTitleSummary}
          onTitleName={onTitleName}
          scrollToScene={initialSceneId}
          onScenes={onScenes}
        />
      </div>
    </div>
  );
});
