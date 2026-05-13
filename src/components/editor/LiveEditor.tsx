import React, { useEffect, useState, useCallback, useMemo, useRef, useDeferredValue } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { Loader2 } from "lucide-react";
import { StatisticsPanel } from "../statistics/StatisticsPanel";

import { parseScreenplay } from "../../lib/screenplayAST";
import { useSettings } from "../../contexts/SettingsContext";
import { useEditorSync } from "../../hooks/useEditorSync";
import { useEditorGuide } from "../../hooks/editor/useEditorGuide";
import { useEditorResize } from "../../hooks/editor/useEditorResize";
import { useLiveEditorPersistence } from "../../hooks/editor/useLiveEditorPersistence";
import { usePreviewLineNavigation } from "../../hooks/usePreviewLineNavigation";
import { useLiveEditorDownloadOptions } from "../../hooks/editor/useLiveEditorDownloadOptions";
import { EditorHeader } from "./EditorHeader";
import { PreviewPanel } from "./PreviewPanel";
import { MarkerRulesPanel } from "./MarkerRulesPanel";
import { useI18n } from "../../contexts/I18nContext";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "../ui/drawer";
import type { MarkerConfig } from "../../types/script";

interface LiveEditorScriptData {
  id: string;
  title?: string;
  content?: string;
  lastModified?: string | number | Date;
  [key: string]: unknown;
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
}

// LiveEditor Component
export default function LiveEditor({ scriptId, initialData, onClose, initialSceneId, defaultShowPreview = false, readOnly = false, onRequestEdit, onOpenMarkerSettings, contentScrollRef, isSidebarOpen, onSetSidebarOpen, onTitleHtml, onHasTitle, onTitleNote, onTitleSummary, onTitleName, showHeader = true, crossModeGuideActive = false, crossModeGuideStep = "", onCrossGuideNext, onCrossGuidePrev, onCrossGuideExit, onPersistMarkerTheme }: LiveEditorProps) {
  const { t } = useI18n();
  const {
    theme = "system",
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    lineHeight,
    accentConfig,
    markerConfigs,
    markerThemes = [],
    currentThemeId = "default",
    switchTheme = () => {},
    hiddenMarkerIds,
    toggleMarkerVisibility
  } = useSettings();

  const [content, setContent] = useState(initialData?.content || "");
  const deferredContent = useDeferredValue(content);

  const [title, setTitle] = useState(initialData?.title || t("liveEditor.untitled"));
  const [loading, setLoading] = useState(!initialData);
  // Save State Machine: 'saved' | 'saving' | 'unsaved' | 'error'
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error" | "local-saved">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Track if we have unsaved changes related to content ref
  const lastSavedContent = useRef(initialData?.content || "");
  const lastSavedTitle = useRef(initialData?.title || "Untitled");

  const [showPreview, setShowPreview] = useState(defaultShowPreview || readOnly);
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const moreActionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const [rawRenderedHtml, setRawRenderedHtml] = useState<string>("");
  const [processedRenderedHtml, setProcessedRenderedHtml] = useState<string>("");
  const [captureRenderedHtml, setCaptureRenderedHtml] = useState<boolean>(false);
  const renderedHtmlRef = useRef({ raw: "", processed: "" });
  const htmlResolverRef = useRef<((html: string) => void) | null>(null);
  const htmlTimeoutRef = useRef<number | null>(null);
  const isDarkMode = theme === "dark" || (theme === "system" && systemPrefersDark);
  const editorTheme = isDarkMode ? oneDark : "light";

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    renderedHtmlRef.current = {
      raw: rawRenderedHtml,
      processed: processedRenderedHtml,
    };
    const html = processedRenderedHtml || rawRenderedHtml;
    if (html && htmlResolverRef.current) {
      const resolve = htmlResolverRef.current;
      htmlResolverRef.current = null;
      if (htmlTimeoutRef.current) {
        window.clearTimeout(htmlTimeoutRef.current);
        htmlTimeoutRef.current = null;
      }
      setCaptureRenderedHtml(false);
      resolve(html);
    }
  }, [rawRenderedHtml, processedRenderedHtml]);

  useEffect(() => {
    renderedHtmlRef.current = { raw: "", processed: "" };
    setRawRenderedHtml("");
    setProcessedRenderedHtml("");
  }, [content, markerConfigs, hiddenMarkerIds]);

  const ensureRenderedHtml = useCallback(() => {
    const existing = renderedHtmlRef.current.processed || renderedHtmlRef.current.raw;
    if (existing) return Promise.resolve(existing);

    if (!showPreview && !readOnly) setShowPreview(true);
    setCaptureRenderedHtml(true);

    // Scale timeout with content size: +200ms per 5KB over the first 5KB, capped at 5s.
    const timeout = Math.min(800 + Math.floor((content?.length || 0) / 5000) * 200, 5000);

    return new Promise((resolve) => {
      htmlResolverRef.current = resolve;
      htmlTimeoutRef.current = window.setTimeout(() => {
        htmlTimeoutRef.current = null;
        if (htmlResolverRef.current === resolve) {
          htmlResolverRef.current = null;
          setCaptureRenderedHtml(false);
          resolve("");
        }
      }, timeout);
    });
  }, [readOnly, showPreview, content]);

  // Parse AST for Statistics & Sync
  const { ast } = useMemo(() => {
    if (!showStats) return { ast: null };
    return parseScreenplay(deferredContent || "", markerConfigs);
  }, [deferredContent, markerConfigs, showStats]);

  // Sync Hook
  const {
    previewRef,
    editorViewRef,
    scrollSyncExtension,
    highlightExtension,
    handleViewUpdate,
    handleEditorScroll,
    setEditorReady,
    scrollEditorToLine,
    highlightEditorLine,
    clearHighlightLine
    // scenes (if needed later)
  } = useEditorSync({ readOnly, showPreview });

  const {
    editorPreviewContainerRef,
    editorPaneWidth,
    isResizing,
    handleResizerPointerDown,
    handleResizerPointerMove,
    handleResizerPointerUp,
    handleResizerDoubleClick,
  } = useEditorResize({ readOnly, showPreview });

  const {
    showGuide, guideSpotlightRect, currentGuide, guideSteps, guideIndex,
    crossGuideSpotlightRect, showCrossModeEditGuide, crossGuideTitle, crossGuideDesc,
    startGuide, finishGuide, handleGuidePrev, handleGuideNext,
  } = useEditorGuide({
    readOnly,
    isMobile,
    t,
    crossModeGuideActive,
    crossModeGuideStep,
    refs: { headerRef, editorPaneRef, previewRef, moreActionsButtonRef },
  });

  const [scenes, setScenes] = useState<Array<{ id?: string; [key: string]: unknown }>>([]);

  const {
    handleChange,
    handleTitleUpdate,
    handleBack,
    handleManualSave,
  } = useLiveEditorPersistence({
    scriptId,
    initialData,
    readOnly,
    content,
    title,
    onClose,
    onTitleName,
    t,
    setContent,
    setTitle,
    setLoading,
    setSaveStatus,
    setLastSaved,
    lastSavedContentRef: lastSavedContent,
    lastSavedTitleRef: lastSavedTitle,
  });

  // BeforeUnload Warning — 只要與雲端版本有 diff 就警告
  useEffect(() => {
      const handleBeforeUnload = (e) => {
          if (content !== lastSavedContent.current || title !== lastSavedTitle.current) {
              e.preventDefault();
              e.returnValue = t("liveEditor.leaveWarning");
              return e.returnValue;
          }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [content, title]);

  const normalizedDownloadOptions = useLiveEditorDownloadOptions({
    t,
    title,
    content,
    renderedHtmlRef,
    ensureRenderedHtml,
  });

  const { handleLocateText, handlePreviewLineClick } = usePreviewLineNavigation({
    content,
    readOnly,
    previewRef,
    scrollEditorToLine,
    highlightEditorLine,
    clearHighlightLine,
  });

  const setPreviewContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      previewRef.current = node;
      if (contentScrollRef) {
        contentScrollRef.current = node;
      }
    },
    [previewRef, contentScrollRef]
  );

  useEffect(() => {
    if (readOnly) return undefined;

    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.altKey) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (String(event.key || "").toLowerCase() !== "s") return;
      event.preventDefault();
      handleManualSave();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleManualSave, readOnly]);

  const extensions = useMemo(() => {
    const baseExtensions = [
        EditorView.lineWrapping, 
        scrollSyncExtension,
        highlightExtension,
        EditorView.theme({
            ".cm-gutters": {
                backgroundColor: "hsl(var(--muted) / 0.3)",
                color: "hsl(var(--muted-foreground) / 0.6)",
                borderRight: "1px solid hsl(var(--border) / 0.6)",
                userSelect: "none",
                minWidth: "30px"
            },
             ".cm-lineNumbers .cm-gutterElement": {
                paddingLeft: "4px",
                cursor: "default",
                userSelect: "none"
            },
            ".cm-scroller": {
                scrollbarWidth: "none",
                msOverflowStyle: "none"
            },
            ".cm-scroller::-webkit-scrollbar": {
                display: "none"
            }
        })
    ];

    return baseExtensions;
  }, [scrollSyncExtension, highlightExtension]);

  // Memoized handlers
  const handleEditorCreate = useCallback((view) => {
      editorViewRef.current = view;
      setEditorReady(true);
      handleEditorScroll();
  }, [setEditorReady, handleEditorScroll]);

  const handleSwitchMarkerTheme = useCallback(async (themeId) => {
    const nextId = String(themeId || "default");
    const prevId = String(currentThemeId || "default");
    if (nextId === prevId) return;
    switchTheme(nextId);
    if (!onPersistMarkerTheme) return;
    const ok = await onPersistMarkerTheme(nextId);
    if (ok === false) {
      switchTheme(prevId);
    }
  }, [currentThemeId, onPersistMarkerTheme, switchTheme]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative z-0">
      {showHeader && (
        <div ref={headerRef}>
          <EditorHeader 
            readOnly={readOnly}
            title={title}
            onBack={handleBack}
            onManualSave={handleManualSave}
            saveStatus={saveStatus}
            lastSaved={lastSaved}
            showRules={showRules}
            onToggleRules={() => setShowRules(prev => !prev)}
            downloadOptions={normalizedDownloadOptions}
            onToggleStats={() => setShowStats(true)}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
            onOpenGuide={startGuide}
            moreActionsRef={moreActionsButtonRef}
            isSidebarOpen={isSidebarOpen}
            onSetSidebarOpen={onSetSidebarOpen}
            onTitleChange={handleTitleUpdate}
            markerConfigs={markerConfigs}
            markerThemes={markerThemes}
            currentThemeId={currentThemeId}
            onSwitchMarkerTheme={handleSwitchMarkerTheme}
            hiddenMarkerIds={hiddenMarkerIds}
            onToggleMarker={toggleMarkerVisibility}
            script={initialData || undefined}
            onScriptUpdate={(updated) => {
                const nextTitle = String((updated as { title?: unknown }).title || "");
                if (nextTitle && nextTitle !== title) setTitle(nextTitle);
            }}
          />
        </div>
      )}

      {/* Editor Area */}
      <div ref={editorPreviewContainerRef} className="flex-1 overflow-hidden relative flex flex-col sm:flex-row">
        {/* Code Editor Pane */}
        {!readOnly && (
            <div
                ref={editorPaneRef}
                className={`${
                  showPreview
                    ? "h-1/2 w-full sm:h-full sm:w-auto sm:shrink-0 sm:basis-[var(--editor-pane-width,50%)] border-b sm:border-b-0 sm:border-r border-border"
                    : "h-full w-full"
                } ${isResizing ? "transition-none" : "transition-[flex-basis,width,height] duration-150"} flex flex-col`}
            >
                <CodeMirror
                    value={content}
                    height="100%"
                    theme={editorTheme}
                    onCreateEditor={handleEditorCreate}
                    extensions={extensions}
                    onChange={handleChange}
                    onUpdate={handleViewUpdate}
                    className="live-editor-cm h-full text-base font-mono flex-1 overflow-hidden"
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: false,
                        highlightActiveLine: false,
                    }}
                />
            </div>
        )}

        {!readOnly && showPreview && (
            <div
                className="hidden sm:flex w-2 shrink-0 items-center justify-center bg-muted/20 hover:bg-muted/40 cursor-col-resize transition-colors"
                role="separator"
                aria-orientation="vertical"
                aria-label={t("liveEditor.resizePreview")}
                onPointerDown={handleResizerPointerDown}
                onPointerMove={handleResizerPointerMove}
                onPointerUp={handleResizerPointerUp}
                onPointerCancel={handleResizerPointerUp}
                onDoubleClick={handleResizerDoubleClick}
            >
                <div className={`h-12 w-[2px] rounded-full ${isResizing ? "bg-primary" : "bg-border"}`} />
            </div>
        )}

        {/* Preview Pane */}
        <PreviewPanel 
            ref={setPreviewContainerRef}
            show={showPreview}
            readOnly={readOnly}
            content={deferredContent}
            type={String(initialData?.type || "script")}
            theme={isDarkMode ? "dark" : "light"}
            fontSize={fontSize}
            bodyFontSize={bodyFontSize}
            dialogueFontSize={dialogueFontSize}
            lineHeight={lineHeight}
            accentColor={accentConfig?.accent}
            markerConfigs={markerConfigs}
            onTitleName={handleTitleUpdate}
            onTitleHtml={onTitleHtml}
            onHasTitle={onHasTitle}
            onTitleNote={onTitleNote}
            onTitleSummary={onTitleSummary}
            onRawHtml={captureRenderedHtml ? setRawRenderedHtml : undefined}
            onProcessedHtml={captureRenderedHtml ? setProcessedRenderedHtml : undefined}
            initialSceneId={initialSceneId}
            onScenes={setScenes}
            onRequestEdit={readOnly ? onRequestEdit : undefined}
            hiddenMarkerIds={hiddenMarkerIds}
            onContentClick={handlePreviewLineClick}
            outerClassName={`${
              readOnly
                ? "w-full h-full"
                : showPreview
                  ? "w-full h-1/2 sm:h-full sm:w-auto sm:grow sm:min-w-[280px]"
                  : "hidden"
            } overflow-hidden bg-background flex flex-col`}
            scrollClassName="h-full overflow-y-auto overflow-x-hidden scrollbar-hide px-4 pt-8 pb-28"
        />

        {/* Stats Side Panel — desktop */}
        {showStats && (
            <>
            <div className="hidden sm:block absolute inset-0 z-10" onClick={() => setShowStats(false)} />
            <div className="hidden sm:flex absolute right-0 top-0 bottom-0 w-[400px] border-l border-border bg-background flex-col shadow-xl z-20 animate-in slide-in-from-right duration-200">
                <div className="h-12 border-b flex items-center px-4 shrink-0 bg-muted/20 gap-3">
                    <button
                        onClick={() => setShowStats(false)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                        ✕
                    </button>
                    <h3 className="font-semibold text-sm">{t("liveEditor.statsPanel")}</h3>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                    <StatisticsPanel
                        rawScript={deferredContent}
                        scriptAst={ast}
                        onLocateText={handleLocateText}
                        scriptId={scriptId}
                    />
                </div>
            </div>
            </>
        )}

        {/* Stats Drawer — mobile only */}
        <Drawer open={showStats && isMobile} onOpenChange={setShowStats} direction="bottom">
            <DrawerContent className="sm:hidden flex flex-col h-[80dvh] outline-none">
                <DrawerTitle className="sr-only">{t("liveEditor.statsPanel")}</DrawerTitle>
                <DrawerDescription className="sr-only">{t("liveEditor.statsPanel")}</DrawerDescription>
                <div className="h-12 border-b flex items-center px-4 shrink-0 bg-muted/20 gap-3">
                    <button
                        onClick={() => setShowStats(false)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                        ✕
                    </button>
                    <h3 className="font-semibold text-sm">{t("liveEditor.statsPanel")}</h3>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
                    <StatisticsPanel
                        rawScript={deferredContent}
                        scriptAst={ast}
                        onLocateText={handleLocateText}
                        scriptId={scriptId}
                    />
                </div>
            </DrawerContent>
        </Drawer>

        <MarkerRulesPanel 
            show={showRules} 
            onClose={() => setShowRules(false)}
            markerConfigs={markerConfigs}
            readOnly={readOnly}
            onOpenMarkerSettings={onOpenMarkerSettings}
        />

      </div>
      <SpotlightGuideOverlay
        open={showGuide && Boolean(currentGuide)}
        zIndex={250}
        spotlightRect={guideSpotlightRect}
        currentStep={guideIndex + 1}
        totalSteps={guideSteps.length}
        title={currentGuide?.title}
        description={currentGuide?.description}
        onSkip={finishGuide}
        skipLabel={t("liveEditor.guideSkip")}
        onPrev={handleGuidePrev}
        prevLabel={t("liveEditor.guidePrev")}
        prevDisabled={guideIndex === 0}
        onNext={handleGuideNext}
        nextLabel={guideIndex === guideSteps.length - 1 ? t("liveEditor.guideDone") : t("liveEditor.guideNext")}
      />
      <SpotlightGuideOverlay
        open={showCrossModeEditGuide}
        zIndex={255}
        spotlightRect={crossGuideSpotlightRect}
        title={crossGuideTitle}
        description={crossGuideDesc}
        onSkip={() => onCrossGuideExit?.()}
        skipLabel={t("liveEditor.crossGuideExit")}
        onPrev={() => onCrossGuidePrev?.()}
        prevLabel={t("liveEditor.crossGuidePrev")}
        prevDisabled={crossModeGuideStep === "editIntro"}
        onNext={() => onCrossGuideNext?.()}
        nextLabel={crossModeGuideStep === "editActions" ? t("liveEditor.crossGuideBackToRead") : t("liveEditor.crossGuideNext")}
        showProgress={false}
      />
    </div>
  );
}
