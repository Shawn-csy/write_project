import React, { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { Loader2 } from "lucide-react";
import { useLiveEditorState } from "../../hooks/editor/useLiveEditorState";
import { EditorHeader } from "./EditorHeader";
import { PreviewPanel } from "./PreviewPanel";
import { MarkerRulesPanel } from "./MarkerRulesPanel";
import { StatsPanelOverlay } from "./StatsPanelOverlay";
import { useI18n } from "../../contexts/I18nContext";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";
import type { MarkerConfig } from "../../types/script";

interface LiveEditorScriptData {
  id: string;
  type?: string;
  title?: string;
  content?: string;
  lastModified?: string | number | Date;
}

interface LiveEditorProps {
  scriptId: string;
  initialData?: LiveEditorScriptData | null;
  onClose: () => void;
  initialSceneId?: string | null;
  defaultShowPreview?: boolean;
  readOnly?: boolean;
  onRequestEdit?: () => void;
  onOpenMarkerSettings?: () => void;
  contentScrollRef?: React.RefObject<HTMLElement | null>;
  isSidebarOpen?: boolean;
  onSetSidebarOpen?: (open: boolean) => void;
  onTitleHtml?: (html: string) => void;
  onHasTitle?: (has: boolean) => void;
  onTitleNote?: (note: string) => void;
  onTitleSummary?: (summary: string) => void;
  onTitleName?: (name: string) => void;
  showHeader?: boolean;
  crossModeGuideActive?: boolean;
  crossModeGuideStep?: string;
  onCrossGuideNext?: () => void;
  onCrossGuidePrev?: () => void;
  onCrossGuideExit?: () => void;
  onPersistMarkerTheme?: (themeId: string) => Promise<boolean | void>;
  hiddenMarkerIds?: string[];
  onToggleMarkerVisibility?: (id: string) => void;
}

export default function LiveEditor({
  scriptId, initialData, onClose, initialSceneId, defaultShowPreview = false,
  readOnly = false, onRequestEdit, onOpenMarkerSettings, contentScrollRef,
  isSidebarOpen, onSetSidebarOpen, onTitleHtml, onHasTitle, onTitleNote, onTitleSummary, onTitleName,
  showHeader = true, crossModeGuideActive = false, crossModeGuideStep = "",
  onCrossGuideNext, onCrossGuidePrev, onCrossGuideExit, onPersistMarkerTheme,
  hiddenMarkerIds = [], onToggleMarkerVisibility = () => {},
}: LiveEditorProps) {
  const { t } = useI18n();
  const s = useLiveEditorState({
    scriptId, initialData, onClose, initialSceneId, defaultShowPreview,
    readOnly, contentScrollRef, onTitleName, crossModeGuideActive, crossModeGuideStep,
    onPersistMarkerTheme, hiddenMarkerIds, toggleMarkerVisibility: onToggleMarkerVisibility, t,
  });

  const handleToggleRules = useCallback(() => s.setShowRules(prev => !prev), [s.setShowRules]);
  const handleToggleStats = useCallback(() => s.setShowStats(true), [s.setShowStats]);
  const handleTogglePreview = useCallback(() => s.setShowPreview(prev => !prev), [s.setShowPreview]);
  const handleScriptUpdate = useCallback((updated: { title?: unknown; [key: string]: unknown }) => {
    const nextTitle = String(updated.title || "");
    if (nextTitle && nextTitle !== s.title) s.handleTitleUpdate(nextTitle);
  }, [s.title, s.handleTitleUpdate]);
  const handleCrossGuideSkip = useCallback(() => onCrossGuideExit?.(), [onCrossGuideExit]);
  const handleCrossGuidePrev = useCallback(() => onCrossGuidePrev?.(), [onCrossGuidePrev]);
  const handleCrossGuideNext = useCallback(() => onCrossGuideNext?.(), [onCrossGuideNext]);

  if (s.loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative z-0">
      {showHeader && (
        <div ref={s.headerRef}>
          <EditorHeader
            readOnly={readOnly}
            title={s.title}
            onBack={s.handleBack}
            onManualSave={s.handleManualSave}
            saveStatus={s.saveStatus}
            lastSaved={s.lastSaved}
            showRules={s.showRules}
            onToggleRules={handleToggleRules}
            downloadOptions={s.normalizedDownloadOptions}
            onToggleStats={handleToggleStats}
            showPreview={s.showPreview}
            onTogglePreview={handleTogglePreview}
            onOpenGuide={s.startGuide}
            moreActionsRef={s.moreActionsButtonRef}
            isSidebarOpen={isSidebarOpen}
            onSetSidebarOpen={onSetSidebarOpen}
            onTitleChange={s.handleTitleUpdate}
            markerConfigs={s.markerConfigs}
            markerThemes={s.markerThemes}
            currentThemeId={s.currentThemeId}
            onSwitchMarkerTheme={s.handleSwitchMarkerTheme}
            hiddenMarkerIds={s.hiddenMarkerIds}
            onToggleMarker={s.toggleMarkerVisibility}
            script={initialData ? { ...initialData } : undefined}
            onScriptUpdate={handleScriptUpdate}
          />
        </div>
      )}

      <div ref={s.editorPreviewContainerRef} className="flex-1 overflow-hidden relative flex flex-col sm:flex-row">
        {!readOnly && (
          <div
            ref={s.editorPaneRef}
            className={`${
              s.showPreview
                ? "h-1/2 w-full sm:h-full sm:w-auto sm:shrink-0 sm:basis-[var(--editor-pane-width,50%)] border-b sm:border-b-0 sm:border-r border-border"
                : "h-full w-full"
            } ${s.isResizing ? "transition-none" : "transition-[flex-basis,width,height] duration-150"} flex flex-col`}
          >
            <CodeMirror
              value={s.content}
              height="100%"
              theme={s.editorTheme as "light" | "dark" | "none" | import("@codemirror/state").Extension}
              onCreateEditor={s.handleEditorCreate}
              extensions={s.extensions}
              onChange={s.handleChange}
              onUpdate={s.handleViewUpdate}
              className="live-editor-cm h-full text-base font-mono flex-1 overflow-hidden"
              basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
            />
          </div>
        )}

        {!readOnly && s.showPreview && (
          <div
            className="hidden sm:flex w-2 shrink-0 items-center justify-center bg-muted/20 hover:bg-muted/40 cursor-col-resize transition-colors"
            role="separator"
            aria-orientation="vertical"
            aria-label={t("liveEditor.resizePreview")}
            onPointerDown={s.handleResizerPointerDown}
            onPointerMove={s.handleResizerPointerMove}
            onPointerUp={s.handleResizerPointerUp}
            onPointerCancel={s.handleResizerPointerUp}
            onDoubleClick={s.handleResizerDoubleClick}
          >
            <div className={`h-12 w-[2px] rounded-full ${s.isResizing ? "bg-primary" : "bg-border"}`} />
          </div>
        )}

        <PreviewPanel
          ref={s.setPreviewContainerRef}
          show={s.showPreview}
          readOnly={readOnly}
          content={s.deferredContent}
          type={String(initialData?.type || "script")}
          theme={s.isDarkMode ? "dark" : "light"}
          fontSize={s.fontSize}
          bodyFontSize={s.bodyFontSize}
          dialogueFontSize={s.dialogueFontSize}
          lineHeight={s.lineHeight}
          accentColor={s.accentConfig?.accent}
          markerConfigs={s.markerConfigs}
          onTitleName={s.handleTitleUpdate}
          onTitleHtml={onTitleHtml}
          onHasTitle={onHasTitle}
          onTitleNote={onTitleNote}
          onTitleSummary={onTitleSummary}
          onRawHtml={s.captureRenderedHtml ? s.setRawRenderedHtml : undefined}
          onProcessedHtml={s.captureRenderedHtml ? s.setProcessedRenderedHtml : undefined}
          initialSceneId={initialSceneId}
          onScenes={s.setScenes}
          onRequestEdit={readOnly ? onRequestEdit : undefined}
          hiddenMarkerIds={s.hiddenMarkerIds}
          onContentClick={s.handlePreviewLineClick}
          outerClassName={`${
            readOnly
              ? "w-full h-full"
              : s.showPreview
                ? "w-full h-1/2 sm:h-full sm:w-auto sm:grow sm:min-w-[280px]"
                : "hidden"
          } overflow-hidden bg-background flex flex-col`}
          scrollClassName="h-full overflow-y-auto overflow-x-hidden scrollbar-hide px-4 pt-8 pb-28"
        />

        <StatsPanelOverlay
          show={s.showStats}
          isMobile={s.isMobile}
          onClose={() => s.setShowStats(false)}
          rawScript={s.deferredContent}
          scriptAst={s.ast}
          onLocateText={s.handleLocateText}
          scriptId={scriptId}
        />

        <MarkerRulesPanel
          show={s.showRules}
          onClose={() => s.setShowRules(false)}
          markerConfigs={s.markerConfigs}
          readOnly={readOnly}
          onOpenMarkerSettings={onOpenMarkerSettings}
        />
      </div>

      <SpotlightGuideOverlay
        open={s.showGuide && Boolean(s.currentGuide)}
        zIndex={250}
        spotlightRect={s.guideSpotlightRect}
        currentStep={s.guideIndex + 1}
        totalSteps={s.guideSteps.length}
        title={s.currentGuide?.title}
        description={s.currentGuide?.description}
        onSkip={s.finishGuide}
        skipLabel={t("liveEditor.guideSkip")}
        onPrev={s.handleGuidePrev}
        prevLabel={t("liveEditor.guidePrev")}
        prevDisabled={s.guideIndex === 0}
        onNext={s.handleGuideNext}
        nextLabel={s.guideIndex === s.guideSteps.length - 1 ? t("liveEditor.guideDone") : t("liveEditor.guideNext")}
      />
      <SpotlightGuideOverlay
        open={s.showCrossModeEditGuide}
        zIndex={255}
        spotlightRect={s.crossGuideSpotlightRect}
        title={s.crossGuideTitle}
        description={s.crossGuideDesc}
        onSkip={handleCrossGuideSkip}
        skipLabel={t("liveEditor.crossGuideExit")}
        onPrev={handleCrossGuidePrev}
        prevLabel={t("liveEditor.crossGuidePrev")}
        prevDisabled={crossModeGuideStep === "editIntro"}
        onNext={handleCrossGuideNext}
        nextLabel={crossModeGuideStep === "editActions" ? t("liveEditor.crossGuideBackToRead") : t("liveEditor.crossGuideNext")}
        showProgress={false}
      />
    </div>
  );
}
