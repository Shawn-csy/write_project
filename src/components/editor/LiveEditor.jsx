import React, { useEffect, useState, useCallback, useMemo, useRef, useDeferredValue } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { updateScript, getScript } from "../../lib/db";
import { FileCode2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { fountainLanguage } from "./fountain-mode";
// import { debounce } from "lodash";
import { debounce } from "../../lib/utils";
import { StatisticsPanel } from "../statistics/StatisticsPanel";

import { parseScreenplay } from "../../lib/screenplayAST";
import { useSettings } from "../../contexts/SettingsContext";
import { useEditorSync } from "../../hooks/useEditorSync";
import { usePreviewLineNavigation } from "../../hooks/usePreviewLineNavigation";
import { extractMetadata } from "../../lib/metadataParser";
import {
  exportScriptAsCsv,
  exportScriptAsDocx,
  exportScriptAsFountain,
  exportScriptAsXlsx,
} from "../../lib/scriptExport";
import { EditorHeader } from "./EditorHeader";
import { PreviewPanel } from "./PreviewPanel";
import { MarkerRulesPanel } from "./MarkerRulesPanel";

const EDITOR_PANE_WIDTH_STORAGE_KEY = "live_editor_pane_width_percent";
const MIN_EDITOR_PANE_WIDTH = 28;
const MAX_EDITOR_PANE_WIDTH = 72;

const clampEditorPaneWidth = (value) => {
  if (!Number.isFinite(value)) return 50;
  return Math.min(MAX_EDITOR_PANE_WIDTH, Math.max(MIN_EDITOR_PANE_WIDTH, value));
};

// LiveEditor Component
export default function LiveEditor({ scriptId, initialData, onClose, initialSceneId, defaultShowPreview = false, readOnly = false, onRequestEdit, onOpenMarkerSettings, contentScrollRef, isSidebarOpen, onSetSidebarOpen, onTitleHtml, onHasTitle, onTitleNote, onTitleSummary, onTitleName, showHeader = true }) {
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

  const [title, setTitle] = useState(initialData?.title || "Untitled");
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
  const editorPreviewContainerRef = useRef(null);
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

  // Local Storage Key Helper
  const getDraftKey = (id) => `draft_script_${id}`;

  // Load initial script w/ Local Draft Check
  useEffect(() => {
    if (initialData && initialData.id === scriptId && initialData.content !== undefined) {
      // Check for local draft
      const draftKey = getDraftKey(scriptId);
      const draftJson = localStorage.getItem(draftKey);
      let loadedContent = initialData.content;
      let loadedTitle = initialData.title || "Untitled";
      let isRestored = false;

      if (draftJson) {
          try {
              const draft = JSON.parse(draftJson);
              const serverMtime = new Date(initialData.lastModified || Date.now()).getTime();
              if (draft.mtime > serverMtime) {
                  // Draft is newer, use draft
                  loadedContent = draft.content;
                  loadedTitle = draft.title;
                  isRestored = true;
                  setSaveStatus("local-saved");
                  console.log("Restored from local draft");
              }
          } catch(e) { console.error("Bad draft", e); }
      }

      setContent(loadedContent);
      setTitle(loadedTitle);
      lastSavedContent.current = loadedContent;
      lastSavedTitle.current = loadedTitle;
      setLoading(false);
      return;
    }

    async function load() {
      if (!scriptId) return;
      try {
        setLoading(true);
        const data = await getScript(scriptId);
        
        let loadedContent = data.content || "";
        let loadedTitle = data.title || "Untitled";
        
        // Draft Check Logic duplicated (cleaner to extract but inline is fine)
        const draftKey = getDraftKey(scriptId);
        const draftJson = localStorage.getItem(draftKey);
        if (draftJson) {
             try {
                 const draft = JSON.parse(draftJson);
                 const serverMtime = new Date(data.lastModified || Date.now()).getTime();
                 if (draft.mtime > serverMtime) {
                     loadedContent = draft.content;
                     loadedTitle = draft.title;
                     setSaveStatus("local-saved"); 
                 }
             } catch(e) {}
        }

        setContent(loadedContent);
        setTitle(loadedTitle);
        lastSavedContent.current = loadedContent;
        lastSavedTitle.current = loadedTitle;
        setLastSaved(new Date(data.lastModified || Date.now()));
      } catch (error) {
        console.error("Failed to load script", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scriptId, initialData]);

  // Persistence Logic
  const performSave = async (id, newContent, newTitle) => {
      try {
        setSaveStatus("saving");
        const meta = extractMetadata(newContent);
        await updateScript(id, { 
            content: newContent, 
            title: newTitle,
            author: meta.author || meta.authors || "",
            draftDate: meta.date || meta.draftdate || ""
        });
        setLastSaved(new Date());
        setSaveStatus("saved");
        lastSavedContent.current = newContent;
        lastSavedTitle.current = newTitle;
        
        // Clear local draft after successful synced save? 
        // No, keep it as backup until newer data comes. 
        // Or update its timestamp? 
        // Actually, if we saved to server, server mtime is now new.
        // We can remove draft or update it.
        // Let's keep writing draft in handleChange.
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveStatus("error");
      }
  };

  // Debounced save
  const debouncedSave = useCallback(
    debounce((id, newContent, newTitle) => {
      performSave(id, newContent, newTitle);
    }, 60000), // Increased to 60s
    []
  );

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
                 e.returnValue = "尚未上傳至雲端，若現在離開，變更將只保留在此瀏覽器中。";
                 return e.returnValue;
             }
          }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus, content, title]);


  const handleChange = (val) => {
    setContent(val);
    if (!readOnly) {
        // 1. Save to LocalStorage immediately
        try {
            const draftKey = getDraftKey(scriptId);
            localStorage.setItem(draftKey, JSON.stringify({
                content: val,
                title: title,
                mtime: Date.now()
            }));
            // Update status only if not currently 'saving' or 'error' (priority)
            // Actually 'saving' should override 'local-saved' in UI, but logically we are local-saved.
            // If we are 'saving', we stay 'saving'.
            setSaveStatus(prev => (prev === 'saving' ? 'saving' : 'local-saved'));
        } catch(e) { console.error("Local save failed", e); }

        // 2. Queue Cloud Save
        debouncedSave(scriptId, val, title);
    }
  };

  const handleTitleUpdate = (newTitle) => {
    if (newTitle && newTitle !== title) {
        setTitle(newTitle);
        onTitleName?.(newTitle);
        if (!readOnly) {
            // Local Save
            try {
                const draftKey = getDraftKey(scriptId);
                localStorage.setItem(draftKey, JSON.stringify({
                    content: content,
                    title: newTitle,
                    mtime: Date.now()
                }));
                setSaveStatus(prev => (prev === 'saving' ? 'saving' : 'local-saved'));
            } catch(e) {}

            debouncedSave(scriptId, content, newTitle);
        }
    }
  };

  const downloadOptions = useMemo(
    () => [
      {
        id: "__helper__",
        hidden: true,
      },
      {
        id: "fountain",
        label: "下載 .fountain",
        icon: FileCode2,
        onClick: () => exportScriptAsFountain(title, content),
      },
      {
        id: "docx",
        label: "下載 Word (.doc)",
        icon: FileText,
        onClick: () =>
          exportScriptAsDocx(title, {
            text: content,
            renderedHtml: processedRenderedHtml || rawRenderedHtml,
          }),
      },
      {
        id: "xlsx",
        label: "下載 Excel (.xlsx)",
        icon: FileSpreadsheet,
        onClick: () =>
          exportScriptAsXlsx(title, {
            text: content,
            renderedHtml: processedRenderedHtml || rawRenderedHtml,
          }),
      },
      {
        id: "csv",
        label: "下載 CSV",
        icon: FileSpreadsheet,
        onClick: () =>
          exportScriptAsCsv(title, {
            text: content,
            renderedHtml: processedRenderedHtml || rawRenderedHtml,
          }),
      },
    ],
    [title, content, processedRenderedHtml, rawRenderedHtml]
  );

  const runRenderedExport = useCallback(
    (exporter) => {
      const currentHtml = renderedHtmlRef.current.processed || renderedHtmlRef.current.raw;
      if (currentHtml) {
        exporter({ text: content, renderedHtml: currentHtml });
        return;
      }

      if (!showPreview && !readOnly) {
        setShowPreview(true);
        setTimeout(() => {
          const nextHtml = renderedHtmlRef.current.processed || renderedHtmlRef.current.raw;
          exporter({ text: content, renderedHtml: nextHtml });
        }, 220);
        return;
      }

      exporter({ text: content, renderedHtml: "" });
    },
    [content, showPreview, readOnly]
  );

  const normalizedDownloadOptions = useMemo(
    () =>
      downloadOptions
        .filter((item) => !item.hidden)
        .map((item) => {
          if (item.id === "docx") {
            return {
              ...item,
              onClick: () => runRenderedExport((payload) => exportScriptAsDocx(title, payload)),
            };
          }
          if (item.id === "xlsx") {
            return {
              ...item,
              onClick: () => runRenderedExport((payload) => exportScriptAsXlsx(title, payload)),
            };
          }
          if (item.id === "csv") {
            return {
              ...item,
              onClick: () => runRenderedExport((payload) => exportScriptAsCsv(title, payload)),
            };
          }
          return item;
        }),
    [downloadOptions, runRenderedExport, title]
  );

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

  const handleBack = async () => {
      debouncedSave.cancel();
      const hasCloudDiff = content !== lastSavedContent.current || title !== lastSavedTitle.current;
      // Ensure latest content is synced to cloud before leaving editor view.
      if (!readOnly && hasCloudDiff) {
          await performSave(scriptId, content, title);
      }
      onClose();
  };

  const handleManualSave = () => {
        if (saveStatus !== 'saving') {
            debouncedSave.cancel();
            performSave(scriptId, content, title);
        }
  };

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

    if (initialData?.type === 'script' || !initialData?.type) {
        return [fountainLanguage, ...baseExtensions];
    }
    return baseExtensions;
  }, [scrollSyncExtension, highlightExtension, initialData?.type]);

  // Memoized handlers
  const handleEditorCreate = useCallback((view) => {
      editorViewRef.current = view;
      setEditorReady(true);
      handleEditorScroll();
  }, [setEditorReady, handleEditorScroll]);

  return (
    <div className="flex flex-col h-full bg-background relative z-0">
      {showHeader && (
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
        isSidebarOpen={isSidebarOpen}
        onSetSidebarOpen={onSetSidebarOpen}
        onTitleChange={handleTitleUpdate}
        markerConfigs={markerConfigs}
        hiddenMarkerIds={hiddenMarkerIds}
        onToggleMarker={toggleMarkerVisibility}
        script={initialData} // Or manage a local script state if needing deeper updates
        onScriptUpdate={(updated) => {
            // Update local state if needed, or just let the dialog handle the API call + prop refresh
            // For now, we rely on the Dialog's API call and maybe a refresh to parent?
            // Since initialData comes from parent, we might need a way to bubble up.
            // But simple display update:
            if (updated.title && updated.title !== title) setTitle(updated.title);
            // Ideally we update the full object in parent scriptManager
            // But for now, relying on next load or context update is okay.
        }}
      />
      )}

      {/* Editor Area */}
      <div ref={editorPreviewContainerRef} className="flex-1 overflow-hidden relative flex flex-col sm:flex-row">
        {/* Code Editor Pane */}
        {!readOnly && (
            <div
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
                    className="h-full text-base font-mono flex-1 overflow-hidden"
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
                aria-label="調整預覽寬度"
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
            scrollClassName="h-full overflow-y-auto overflow-x-hidden scrollbar-hide px-4 py-8"
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
                    <h3 className="font-semibold text-sm">統計分析面板</h3>
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
    </div>
  );
}
