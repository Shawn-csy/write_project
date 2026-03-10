import React, { useEffect, useState, useCallback, useMemo, useRef, useDeferredValue } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { Loader2 } from "lucide-react";
import { StatisticsPanel } from "../statistics/StatisticsPanel";

import { parseScreenplay } from "../../lib/screenplayAST";
import { useSettings } from "../../contexts/SettingsContext";
import { useEditorSync } from "../../hooks/useEditorSync";
import { useLiveEditorPersistence } from "../../hooks/editor/useLiveEditorPersistence";
import { usePreviewLineNavigation } from "../../hooks/usePreviewLineNavigation";
import { useLiveEditorDownloadOptions } from "../../hooks/editor/useLiveEditorDownloadOptions";
import { EditorHeader } from "./EditorHeader";
import { PreviewPanel } from "./PreviewPanel";
import { MarkerRulesPanel } from "./MarkerRulesPanel";
import { useI18n } from "../../contexts/I18nContext";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";

const EDITOR_PANE_WIDTH_STORAGE_KEY = "live_editor_pane_width_percent";
const MIN_EDITOR_PANE_WIDTH = 28;
const MAX_EDITOR_PANE_WIDTH = 72;

const clampEditorPaneWidth = (value) => {
  if (!Number.isFinite(value)) return 50;
  return Math.min(MAX_EDITOR_PANE_WIDTH, Math.max(MIN_EDITOR_PANE_WIDTH, value));
};

// LiveEditor Component
export default function LiveEditor({ scriptId, initialData, onClose, initialSceneId, defaultShowPreview = false, readOnly = false, onRequestEdit, onOpenMarkerSettings, contentScrollRef, isSidebarOpen, onSetSidebarOpen, onTitleHtml, onHasTitle, onTitleNote, onTitleSummary, onTitleName, showHeader = true, crossModeGuideActive = false, crossModeGuideStep = "", onCrossGuideNext, onCrossGuidePrev, onCrossGuideExit }) {
  const { t } = useI18n();
  const {
    theme = "system",
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    lineHeight,
    accentConfig,
    markerConfigs,
    hiddenMarkerIds,
    toggleMarkerVisibility
  } = useSettings();

  const [content, setContent] = useState(initialData?.content || "");
  const deferredContent = useDeferredValue(content);

  const [title, setTitle] = useState(initialData?.title || t("liveEditor.untitled"));
  const [loading, setLoading] = useState(!initialData);
  // Save State Machine: 'saved' | 'saving' | 'unsaved' | 'error'
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSaved, setLastSaved] = useState(null);
  
  // Track if we have unsaved changes related to content ref
  const lastSavedContent = useRef(initialData?.content || "");
  const lastSavedTitle = useRef(initialData?.title || "Untitled");

  const [showPreview, setShowPreview] = useState(defaultShowPreview || readOnly);
  const [editorPaneWidth, setEditorPaneWidth] = useState(() => {
    if (typeof window === "undefined") return 50;
    const stored = Number(window.localStorage.getItem(EDITOR_PANE_WIDTH_STORAGE_KEY));
    return clampEditorPaneWidth(stored);
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideSpotlightRect, setGuideSpotlightRect] = useState(null);
  const [crossGuideSpotlightRect, setCrossGuideSpotlightRect] = useState(null);
  const editorPreviewContainerRef = useRef(null);
  const headerRef = useRef(null);
  const editorPaneRef = useRef(null);
  const moreActionsButtonRef = useRef(null);
  const editorPaneWidthRef = useRef(editorPaneWidth);
  const resizeFrameRef = useRef(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [rawRenderedHtml, setRawRenderedHtml] = useState("");
  const [processedRenderedHtml, setProcessedRenderedHtml] = useState("");
  const renderedHtmlRef = useRef({ raw: "", processed: "" });
  const isDarkMode = theme === "dark" || (theme === "system" && systemPrefersDark);
  const editorTheme = isDarkMode ? oneDark : "light";

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(media.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    renderedHtmlRef.current = {
      raw: rawRenderedHtml,
      processed: processedRenderedHtml,
    };
  }, [rawRenderedHtml, processedRenderedHtml]);

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

  const [scenes, setScenes] = useState([]); 

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

  // BeforeUnload Warning
  useEffect(() => {
      const handleBeforeUnload = (e) => {
          if (saveStatus === 'unsaved' || saveStatus === 'saving' || saveStatus === 'error' || saveStatus === 'local-saved') {
             // local-saved is technically safe locally, but maybe user wants to ensure cloud?
             // Prompt anyway to be safe? 
             // "已儲存至本機" means browser close is SAFE.
             // So if status is 'local-saved', we DO NOT need to warn about data loss,
             // BUT we might want to warn about "upload pending".
             // However, user specifically asked for "Local Draft" to be safe against crash/close.
             // So we can SKIP warning if saved to local.
             
             // Let's check diff against CLOUD lastSavedContent
             if (content !== lastSavedContent.current || title !== lastSavedTitle.current) {
                 // It IS dirty relative to cloud.
                 // But is it dirty relative to local? 
                 // We write local on every change. So local is sync.
                 
                 // If status is 'local-saved', we can probably let them go, 
                 // but maybe just warn "Changes saved to THIS BROWSER only".
                 // For now, let's KEEP warning but maybe change text?
                 // Or just keep standard warning. Safest.
                 e.preventDefault();
                 e.returnValue = t("liveEditor.leaveWarning");
                 return e.returnValue;
             }
          }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus, content, title]);

  const normalizedDownloadOptions = useLiveEditorDownloadOptions({
    t,
    title,
    content,
    processedRenderedHtml,
    rawRenderedHtml,
    renderedHtmlRef,
    showPreview,
    setShowPreview,
    readOnly,
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
    (node) => {
      previewRef.current = node;
      if (contentScrollRef) {
        contentScrollRef.current = node;
      }
    },
    [previewRef, contentScrollRef]
  );

  const guideSteps = useMemo(() => ([
    {
      title: t("liveEditor.guideEditScriptTitle"),
      description: t("liveEditor.guideEditScriptDesc"),
      target: "header",
    },
    {
      title: t("liveEditor.guideEditorTitle"),
      description: t("liveEditor.guideEditorDesc"),
      target: "editor",
    },
    {
      title: t("liveEditor.guidePreviewTitle"),
      description: t("liveEditor.guidePreviewDesc"),
      target: "preview",
    },
    {
      title: t("liveEditor.guideActionsTitle"),
      description: t("liveEditor.guideActionsDesc"),
      target: "actions",
    },
  ]), [t]);

  const currentGuide = showGuide ? guideSteps[guideIndex] : null;
  const showCrossModeEditGuide = !readOnly && crossModeGuideActive && (
    crossModeGuideStep === "editIntro" ||
    crossModeGuideStep === "editPreview" ||
    crossModeGuideStep === "editActions"
  );
  const crossGuideTitle = (() => {
    if (crossModeGuideStep === "editPreview") return t("liveEditor.crossGuideEditPreviewTitle");
    if (crossModeGuideStep === "editActions") return t("liveEditor.crossGuideEditActionsTitle");
    return t("liveEditor.crossGuideEditIntroTitle");
  })();
  const crossGuideDesc = (() => {
    if (crossModeGuideStep === "editPreview") return t("liveEditor.crossGuideEditPreviewDesc");
    if (crossModeGuideStep === "editActions") return t("liveEditor.crossGuideEditActionsDesc");
    return t("liveEditor.crossGuideEditIntroDesc");
  })();
  const crossGuideTarget = (() => {
    if (crossModeGuideStep === "editPreview") return "preview";
    if (crossModeGuideStep === "editActions") return "actions";
    return "editor";
  })();

  const getGuideTargetElement = useCallback((target) => {
    switch (target) {
      case "header":
        return headerRef.current;
      case "editor":
        return editorPaneRef.current;
      case "preview":
        return previewRef.current;
      case "actions":
        return moreActionsButtonRef.current;
      default:
        return null;
    }
  }, [previewRef]);

  const updateGuideSpotlight = useCallback(() => {
    if (!showGuide) {
      setGuideSpotlightRect(null);
      return;
    }
    const step = guideSteps[guideIndex];
    const element = step ? getGuideTargetElement(step.target) : null;
    if (!element) {
      setGuideSpotlightRect(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      setGuideSpotlightRect(null);
      return;
    }
    const padding = 8;
    setGuideSpotlightRect({
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  }, [showGuide, guideSteps, guideIndex, getGuideTargetElement]);

  useEffect(() => {
    if (!showGuide) return undefined;
    updateGuideSpotlight();
    const onLayoutChange = () => updateGuideSpotlight();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [showGuide, guideIndex, updateGuideSpotlight]);

  const updateCrossGuideSpotlight = useCallback(() => {
    if (!showCrossModeEditGuide) {
      setCrossGuideSpotlightRect(null);
      return;
    }
    const element = getGuideTargetElement(crossGuideTarget);
    if (!element) {
      setCrossGuideSpotlightRect(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      setCrossGuideSpotlightRect(null);
      return;
    }
    const padding = 8;
    setCrossGuideSpotlightRect({
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  }, [crossGuideTarget, getGuideTargetElement, showCrossModeEditGuide]);

  useEffect(() => {
    if (!showCrossModeEditGuide) {
      setCrossGuideSpotlightRect(null);
      return undefined;
    }
    updateCrossGuideSpotlight();
    const onLayoutChange = () => updateCrossGuideSpotlight();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [showCrossModeEditGuide, crossModeGuideStep, updateCrossGuideSpotlight]);

  const startGuide = useCallback(() => {
    setGuideIndex(0);
    setShowGuide(true);
  }, []);

  const finishGuide = useCallback(() => {
    setShowGuide(false);
    setGuideSpotlightRect(null);
  }, []);

  const handleGuidePrev = useCallback(() => {
    setGuideIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleGuideNext = useCallback(() => {
    if (guideIndex >= guideSteps.length - 1) {
      finishGuide();
      return;
    }
    setGuideIndex((prev) => Math.min(guideSteps.length - 1, prev + 1));
  }, [finishGuide, guideIndex, guideSteps.length]);

  const persistEditorPaneWidth = useCallback((value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(EDITOR_PANE_WIDTH_STORAGE_KEY, String(Math.round(value * 10) / 10));
    } catch (_error) {
      // Ignore storage errors (private mode / quota).
    }
  }, []);

  const applyEditorPaneWidth = useCallback((nextWidth) => {
    const clamped = clampEditorPaneWidth(nextWidth);
    editorPaneWidthRef.current = clamped;
    const container = editorPreviewContainerRef.current;
    if (container) {
      container.style.setProperty("--editor-pane-width", `${clamped}%`);
    }
  }, []);

  const updateEditorPaneWidth = useCallback((clientX) => {
    const container = editorPreviewContainerRef.current;
    if (!container || !Number.isFinite(clientX)) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    const clamped = clampEditorPaneWidth(ratio);
    if (resizeFrameRef.current) return;
    resizeFrameRef.current = requestAnimationFrame(() => {
      applyEditorPaneWidth(clamped);
      resizeFrameRef.current = null;
    });
  }, [applyEditorPaneWidth]);

  const handleResizerPointerDown = useCallback((event) => {
    if (readOnly || !showPreview) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsResizing(true);
    updateEditorPaneWidth(event.clientX);
  }, [readOnly, showPreview, updateEditorPaneWidth]);

  const handleResizerPointerMove = useCallback((event) => {
    if (!isResizing) return;
    updateEditorPaneWidth(event.clientX);
  }, [isResizing, updateEditorPaneWidth]);

  const handleResizerPointerUp = useCallback((event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const finalWidth = editorPaneWidthRef.current;
    setEditorPaneWidth(finalWidth);
    persistEditorPaneWidth(finalWidth);
    setIsResizing(false);
  }, [persistEditorPaneWidth]);

  const handleResizerDoubleClick = useCallback(() => {
    const resetWidth = 50;
    applyEditorPaneWidth(resetWidth);
    setEditorPaneWidth(resetWidth);
    persistEditorPaneWidth(resetWidth);
  }, [applyEditorPaneWidth, persistEditorPaneWidth]);

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

  useEffect(() => {
    if (!isResizing) return undefined;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing]);

  useEffect(() => {
    applyEditorPaneWidth(editorPaneWidth);
  }, [editorPaneWidth, applyEditorPaneWidth]);

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ... (previous hooks)
  
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
            hiddenMarkerIds={hiddenMarkerIds}
            onToggleMarker={toggleMarkerVisibility}
            script={initialData}
            onScriptUpdate={(updated) => {
                if (updated.title && updated.title !== title) setTitle(updated.title);
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
                className={`h-full ${
                  showPreview
                    ? "w-full sm:w-auto sm:shrink-0 sm:basis-[var(--editor-pane-width,50%)] sm:border-r sm:border-border"
                    : "w-full"
                } ${isResizing ? "transition-none" : "transition-[flex-basis,width] duration-150"} flex flex-col`}
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
            type={initialData?.type || "script"}
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
            onRawHtml={setRawRenderedHtml}
            onProcessedHtml={setProcessedRenderedHtml}
            initialSceneId={initialSceneId}
            onScenes={setScenes}
            onRequestEdit={readOnly ? onRequestEdit : undefined}
            hiddenMarkerIds={hiddenMarkerIds}
            onContentClick={handlePreviewLineClick}
            outerClassName={`${
              readOnly
                ? "w-full"
                : showPreview
                  ? "w-full sm:w-auto sm:grow sm:min-w-[280px]"
                  : "hidden"
            } h-full overflow-hidden bg-background flex flex-col`}
            scrollClassName="h-full overflow-y-auto overflow-x-hidden scrollbar-hide px-4 pt-8 pb-28"
        />

        {/* Stats Side Panel (Non-modal) */}
        {showStats && (
            <div className="w-full sm:w-[400px] border-l border-border bg-background shrink-0 flex flex-col h-full shadow-xl z-20 transition-all duration-300">
                <div className="h-12 border-b flex items-center px-4 shrink-0 bg-muted/20 gap-3">
                    <button 
                        onClick={() => setShowStats(false)} 
                        className="text-muted-foreground hover:text-foreground text-sm"
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
        )}

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
